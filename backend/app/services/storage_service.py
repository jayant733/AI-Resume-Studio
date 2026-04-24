from __future__ import annotations

import datetime
import logging
import os
from pathlib import Path
from typing import Optional

from google.cloud import storage
from app.utils.config import get_settings

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self) -> None:
        settings = get_settings()
        self.bucket_name = settings.gcs_bucket_name
        self.credentials_path = settings.gcs_credentials_path
        
        if self.credentials_path and os.path.exists(self.credentials_path):
            self.client = storage.Client.from_service_account_json(self.credentials_path)
        else:
            # Fallback to default credentials (e.g. environment variable GOOGLE_APPLICATION_CREDENTIALS)
            try:
                self.client = storage.Client()
            except Exception as e:
                logger.warning(f"GCS Client initialization failed: {e}. Cloud storage will be unavailable.")
                self.client = None

    def upload_file(self, local_path: Path, remote_path: str) -> Optional[str]:
        """Uploads a file to GCS and returns the blob name."""
        if not self.client or not self.bucket_name:
            logger.error("GCS client or bucket name not configured.")
            return None
            
        try:
            bucket = self.client.bucket(self.bucket_name)
            blob = bucket.blob(remote_path)
            blob.upload_from_filename(str(local_path))
            logger.info(f"File {local_path} uploaded to {remote_path} in GCS.")
            return remote_path
        except Exception as e:
            logger.error(f"GCS Upload failed: {e}")
            return None

    def get_signed_url(self, blob_name: str, expiration_minutes: int = 60) -> Optional[str]:
        """Generates a signed URL for secure, temporary access."""
        if not self.client or not self.bucket_name:
            return None
            
        try:
            bucket = self.client.bucket(self.bucket_name)
            blob = bucket.blob(blob_name)
            
            url = blob.generate_signed_url(
                version="v4",
                expiration=datetime.timedelta(minutes=expiration_minutes),
                method="GET",
            )
            return url
        except Exception as e:
            logger.error(f"GCS Signed URL generation failed: {e}")
            return None

    def delete_file(self, blob_name: str) -> bool:
        """Deletes a file from GCS."""
        if not self.client or not self.bucket_name:
            return False
            
        try:
            bucket = self.client.bucket(self.bucket_name)
            blob = bucket.blob(blob_name)
            blob.delete()
            logger.info(f"File {blob_name} deleted from GCS.")
            return True
        except Exception as e:
            logger.error(f"GCS Deletion failed: {e}")
            return False
