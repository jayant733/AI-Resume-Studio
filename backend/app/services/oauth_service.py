from __future__ import annotations

import logging
import httpx
from typing import Any, Dict, Optional
from app.utils.config import get_settings

logger = logging.getLogger(__name__)

class OAuthService:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def get_google_user_info(self, code: str) -> Dict[str, Any]:
        """Exchanges Google auth code for user info."""
        async with httpx.AsyncClient() as client:
            # 1. Exchange code for access token
            token_url = "https://oauth2.googleapis.com/token"
            data = {
                "code": code,
                "client_id": self.settings.GOOGLE_CLIENT_ID,
                "client_secret": self.settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": self.settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            }
            token_res = await client.post(token_url, data=data)
            token_res.raise_for_status()
            token_data = token_res.json()
            access_token = token_data.get("access_token")

            # 2. Get user info
            user_info_res = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            user_info_res.raise_for_status()
            return user_info_res.json()

    async def get_github_user_info(self, code: str) -> Dict[str, Any]:
        """Exchanges GitHub auth code for user info."""
        async with httpx.AsyncClient() as client:
            # 1. Exchange code for access token
            token_url = "https://github.com/login/oauth/access_token"
            data = {
                "client_id": self.settings.GITHUB_CLIENT_ID,
                "client_secret": self.settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": self.settings.GITHUB_REDIRECT_URI,
            }
            token_res = await client.post(token_url, data=data, headers={"Accept": "application/json"})
            token_res.raise_for_status()
            token_data = token_res.json()
            access_token = token_data.get("access_token")

            # 2. Get user info
            user_res = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            user_res.raise_for_status()
            user_data = user_res.json()

            # 3. Get email if not public
            if not user_data.get("email"):
                email_res = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                email_res.raise_for_status()
                emails = email_res.json()
                # Find primary email
                primary_email = next((e["email"] for e in emails if e["primary"]), emails[0]["email"])
                user_data["email"] = primary_email

            return user_data
