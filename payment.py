"""Payment integration module for GitPulse using Stripe."""

from __future__ import annotations

import json
import os
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Optional


class StripePayment:
    """Stripe payment integration for GitPulse subscriptions."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("STRIPE_SECRET_KEY")
        self.api_url = "https://api.stripe.com/v1"
        
        # Pricing IDs (replace with actual Stripe Price IDs)
        self.prices = {
            "pro_monthly": "price_pro_monthly",
            "pro_yearly": "price_pro_yearly",
            "team_monthly": "price_team_monthly",
            "team_yearly": "price_team_yearly"
        }
    
    def create_checkout_session(self, price_id: str, customer_email: str, success_url: str, cancel_url: str) -> Optional[dict]:
        """Create a Stripe Checkout session."""
        if not self.api_key:
            return None
        
        data = {
            "mode": "subscription",
            "line_items[0][price]": price_id,
            "line_items[0][quantity]": "1",
            "customer_email": customer_email,
            "success_url": success_url,
            "cancel_url": cancel_url,
            "allow_promotion_codes": "true"
        }
        
        body = "&".join(f"{k}={v}" for k, v in data.items()).encode("utf-8")
        
        req = urllib.request.Request(
            f"{self.api_url}/checkout/sessions",
            data=body,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode())
            return result
        except Exception:
            return None
    
    def verify_subscription(self, subscription_id: str) -> Optional[dict]:
        """Verify a subscription status."""
        if not self.api_key:
            return None
        
        req = urllib.request.Request(
            f"{self.api_url}/subscriptions/{subscription_id}",
            headers={"Authorization": f"Bearer {self.api_key}"},
            method="GET"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode())
            return result
        except Exception:
            return None
    
    def cancel_subscription(self, subscription_id: str) -> bool:
        """Cancel a subscription."""
        if not self.api_key:
            return False
        
        req = urllib.request.Request(
            f"{self.api_url}/subscriptions/{subscription_id}",
            headers={"Authorization": f"Bearer {self.api_key}"},
            method="DELETE"
        )
        
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status == 200
        except Exception:
            return False


class LicenseManager:
    """Manage GitPulse licenses and subscriptions."""
    
    def __init__(self, license_file: Optional[Path] = None):
        self.license_file = license_file or Path(__file__).parent / ".gitpulse-license.json"
        self.license_data = self._load_license()
    
    def _load_license(self) -> dict:
        """Load license data from file."""
        if not self.license_file.exists():
            return self._get_default_license()
        
        try:
            data = json.loads(self.license_file.read_text(encoding="utf-8"))
            if not isinstance(data, dict):
                return self._get_default_license()
            return data
        except (json.JSONDecodeError, OSError):
            return self._get_default_license()
    
    def _get_default_license(self) -> dict:
        """Get default license data (free tier)."""
        return {
            "tier": "free",
            "license_key": None,
            "subscription_id": None,
            "customer_id": None,
            "activated_at": None,
            "expires_at": None,
            "status": "active"
        }
    
    def _save(self):
        """Save license data to file."""
        try:
            self.license_file.write_text(
                json.dumps(self.license_data, indent=2),
                encoding="utf-8"
            )
        except OSError:
            pass
    
    def activate_license(self, license_key: str, tier: str, subscription_id: str, customer_id: str) -> bool:
        """Activate a license."""
        self.license_data.update({
            "tier": tier,
            "license_key": license_key,
            "subscription_id": subscription_id,
            "customer_id": customer_id,
            "activated_at": datetime.utcnow().isoformat(),
            "status": "active"
        })
        self._save()
        return True
    
    def deactivate_license(self) -> bool:
        """Deactivate the current license."""
        self.license_data.update({
            "tier": "free",
            "license_key": None,
            "subscription_id": None,
            "status": "inactive"
        })
        self._save()
        return True
    
    def get_tier(self) -> str:
        """Get current tier."""
        return self.license_data.get("tier", "free")
    
    def is_active(self) -> bool:
        """Check if license is active."""
        status = self.license_data.get("status", "inactive")
        expires_at = self.license_data.get("expires_at")
        
        if status != "active":
            return False
        
        if expires_at:
            try:
                expiry = datetime.fromisoformat(expires_at)
                if datetime.utcnow() > expiry:
                    return False
            except ValueError:
                pass
        
        return True
    
    def get_subscription_id(self) -> Optional[str]:
        """Get subscription ID."""
        return self.license_data.get("subscription_id")
