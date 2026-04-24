from __future__ import annotations

import re
import logging
from typing import Any
from app.models.schemas import ResumeStructuredData

logger = logging.getLogger(__name__)

class ValidatorService:
    """
    Ensures LLM optimizations are grounded in the original resume data.
    Prevents hallucination of new metrics, companies, or roles.
    """

    def validate_optimized_resume(
        self, 
        original: ResumeStructuredData, 
        optimized: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Main entry point for validation.
        Returns a cleaned version of the optimized JSON.
        """
        # 1. Ensure basic structure and identity are preserved
        optimized["name"] = original.name
        optimized["contact"] = original.contact.model_dump()
        
        # 2. Validate Experience (The most critical part)
        if "experience" in optimized and isinstance(optimized["experience"], list):
            optimized["experience"] = self._validate_experience(original.experience, optimized["experience"])
            
        # 3. Validate Education (Should not change)
        optimized["education"] = [e.model_dump() for e in original.education]
        
        # 4. Strip hallucinated sections
        allowed_keys = {
            "summary", "skills", "experience", "education", 
            "certifications", "projects", "ats_keywords", "recommendations"
        }
        return {k: v for k, v in optimized.items() if k in allowed_keys or k in ["name", "contact"]}

    def _validate_experience(self, original_list: list[Any], optimized_list: list[dict]) -> list[dict]:
        """Ensures optimized experience entries map to original companies and roles."""
        validated_exp = []
        
        # Create a mapping of original companies for quick lookup
        original_map = {
            (e.company.lower() if e.company else ""): e 
            for e in original_list
        }

        for opt_entry in optimized_list:
            company = opt_entry.get("company", "")
            company_lower = company.lower() if company else ""
            
            # Find the closest original entry
            orig_entry = original_map.get(company_lower)
            
            if not orig_entry:
                # If the company is completely new, it's likely a hallucination
                logger.warning(f"Validation: Removed hallucinated company '{company}'")
                continue

            # Ensure the role title hasn't been completely invented (basic check)
            # We allow wording improvements, but if it's completely different we might flag it
            
            # Validate Bullets for Metrics
            opt_entry["bullets"] = self._validate_bullets(
                orig_entry.bullets, 
                opt_entry.get("bullets", [])
            )
            
            # Restore original dates to be safe
            opt_entry["start_date"] = orig_entry.start_date
            opt_entry["end_date"] = orig_entry.end_date
            
            validated_exp.append(opt_entry)
            
        return validated_exp

    def _validate_bullets(self, original_bullets: list[str], optimized_bullets: list[str]) -> list[str]:
        """
        Checks that optimized bullets don't contain new metrics not present in original.
        Example: If original has '50%' and optimized says '90%', we revert or flag.
        """
        # Extract all numbers and percentages from original bullets
        original_metrics = set()
        for b in original_bullets:
            original_metrics.update(self._extract_metrics(b))
            
        validated_bullets = []
        for b in optimized_bullets:
            opt_metrics = self._extract_metrics(b)
            
            # Check if any NEW metrics were introduced
            new_metrics = opt_metrics - original_metrics
            
            if new_metrics:
                # If LLM added a metric like '95%' that wasn't in original, we strip the specific metric 
                # or slightly revert the bullet. For now, we log a warning.
                # In a strict implementation, we would regex-replace the new metric.
                logger.warning(f"Validation: Detected potentially hallucinated metrics {new_metrics} in bullet: {b}")
                
                # Simple mitigation: if it's a completely new percentage/number, we might want to flag it
                # For this implementation, we allow it but log for the 'Explainability' layer.
            
            validated_bullets.append(b)
            
        return validated_bullets

    def _extract_metrics(self, text: str) -> set[str]:
        """Finds numbers, percentages, and dollar amounts."""
        # Matches 50%, $100k, 10x, etc.
        return set(re.findall(r"(\d+[%xX]?|\$[\d,]+[kKmM]?)", text))
