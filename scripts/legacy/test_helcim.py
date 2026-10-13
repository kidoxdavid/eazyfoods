#!/usr/bin/env python3
"""
Script to test Helcim API connection and verify token works.
Run this to ensure your Helcim integration is properly configured.
"""

import httpx
import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_helcim_connection(api_token=None, test_mode=True):
    """Test Helcim API connection with provided token."""
    
    # Get token from parameter or environment
    token = api_token or os.getenv('HELCIM_API_TOKEN')
    
    if not token:
        print("✗ Error: No Helcim API token provided")
        print("\nUsage:")
        print("  1. Set HELCIM_API_TOKEN in your .env file, OR")
        print("  2. Pass token as argument: python test_helcim.py YOUR_TOKEN")
        print("\nTo add to .env file:")
        print("  HELCIM_API_TOKEN=your_token_here")
        print("  HELCIM_TEST_MODE=true")
        return False
    
    # Get test mode from env if not provided
    if api_token:
        test_mode = os.getenv('HELCIM_TEST_MODE', 'true').lower() == 'true'
    
    api_url = os.getenv('HELCIM_API_URL', 'https://api.helcim.com/v2')
    
    print("=" * 60)
    print("Testing Helcim API Connection")
    print("=" * 60)
    print(f"API URL: {api_url}")
    print(f"Test Mode: {test_mode}")
    print(f"Token: {token[:10]}...{token[-4:] if len(token) > 14 else '***'}")
    print("-" * 60)
    
    headers = {
        "api-token": token,
        "Content-Type": "application/json"
    }
    
    # Test 1: Simple API call - Get account info or validate token
    print("\n[Test 1] Testing API token validity...")
    try:
        # Try a simple endpoint to validate the token
        # Helcim v2 API - test with a minimal request
        with httpx.Client(timeout=30.0) as client:
            # Test with a simple payment validation endpoint
            # Note: This is a basic test - actual endpoints may vary
            test_payload = {
                "amount": 1.00,
                "currency": "CAD",
                "paymentType": "purchase",
                "test": test_mode
            }
            
            # Try to initialize a test payment (this will validate the token)
            response = client.post(
                f"{api_url}/payment/initialize",
                headers=headers,
                json=test_payload,
                timeout=30.0
            )
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✓ API token is valid!")
                print(f"✓ Response: {data}")
                print("\n" + "=" * 60)
                print("✓ Helcim connection test PASSED!")
                print("=" * 60)
                return True
            elif response.status_code == 401:
                print("✗ Authentication failed - Invalid API token")
                print("\nTroubleshooting:")
                print("1. Verify your API token is correct")
                print("2. Check if you're using test token in test mode")
                print("3. Ensure token hasn't expired or been revoked")
                return False
            elif response.status_code == 400:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("message", "Bad request")
                print(f"✗ Request error: {error_msg}")
                print("\nNote: Token may be valid but request format needs adjustment")
                print("This could mean the token works but the test endpoint needs different parameters")
                return False
            else:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("message", f"HTTP {response.status_code}")
                print(f"✗ API Error: {error_msg}")
                print(f"Full response: {response.text[:200]}")
                return False
                
    except httpx.TimeoutException:
        print("✗ Connection timeout - Helcim API is not responding")
        print("\nTroubleshooting:")
        print("1. Check your internet connection")
        print("2. Verify API URL is correct")
        return False
    except httpx.ConnectError:
        print("✗ Connection error - Could not reach Helcim API")
        print("\nTroubleshooting:")
        print("1. Check your internet connection")
        print("2. Verify API URL: https://api.helcim.com/v2")
        print("3. Check firewall settings")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        print(f"Error type: {type(e).__name__}")
        return False


def test_via_backend():
    """Test Helcim via the backend API endpoint."""
    print("\n" + "=" * 60)
    print("Alternative: Testing via Backend API")
    print("=" * 60)
    print("\nYou can also test via your backend API:")
    print("  1. Make sure backend is running (http://localhost:8000)")
    print("  2. Test config endpoint:")
    print("     curl http://localhost:8000/api/v1/customer/payments/config")
    print("\nOr use the FastAPI docs:")
    print("  http://localhost:8000/api/docs")
    print("\nThen navigate to: /api/v1/customer/payments/config")


if __name__ == "__main__":
    # Check if token provided as command line argument
    token = None
    if len(sys.argv) > 1:
        token = sys.argv[1]
        print(f"Using token from command line argument")
    
    success = test_helcim_connection(token)
    
    if not success:
        test_via_backend()
    
    sys.exit(0 if success else 1)
