#!/usr/bin/env python3
"""
Test script for Try On functionality
"""
import sys
import io
# Avoid encoding issues on Windows terminals
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests
from pathlib import Path

sys.path.insert(0, '.')

BACKEND_URL = "http://localhost:8000"

def test_health():
    """Test backend health"""
    print("[TEST] Checking backend health...")
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        print(f"✓ Backend health: {response.json()}")
        return True
    except Exception as e:
        print(f"✗ Backend health failed: {e}")
        return False

def test_products():
    """Test products endpoint"""
    print("[TEST] Checking products endpoint...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/products?limit=5", timeout=10)
        data = response.json()
        count = len(data.get('products', []))
        print(f"✓ Got {count} products")
        return True
    except Exception as e:
        print(f"✗ Products endpoint failed: {e}")
        return False

def test_clothing_analyzer():
    """Test clothing analyzer"""
    print("[TEST] Testing clothing analyzer...")
    try:
        from services.clothing_analyzer import analyze_clothing
        
        # Test with URL
        print("  - Testing with URL...")
        result = analyze_clothing(image_url='https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400')
        print(f"    Category: {result.get('category')}")
        print(f"    Primary Color: {result.get('primary_color')}")
        print(f"    Occasion: {result.get('occasion')}")
        print(f"    Method: {result.get('analysis_method')}")
        print("✓ Clothing analyzer works")
        return True
    except Exception as e:
        print(f"✗ Clothing analyzer failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_recommendation_service():
    """Test recommendation service"""
    print("[TEST] Testing recommendation service...")
    try:
        from services.recommendation_service import build_outfit_matches
        
        result = build_outfit_matches(
            user_id="test_user",
            occasion="casual",
            category="shirt",
            primary_color="blue",
            tags=["cotton", "casual"],
            limit=3
        )
        
        external_count = len(result.get('external_matches', []))
        wardrobe_count = len(result.get('wardrobe_matches', []))
        
        print(f"  - External matches: {external_count}")
        print(f"  - Wardrobe matches: {wardrobe_count}")
        print(f"  - Strategy: {result.get('strategy')}")
        print("✓ Recommendation service works")
        return True
    except Exception as e:
        print(f"✗ Recommendation service failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_virtual_tryon():
    """Test virtual try-on generation"""
    print("[TEST] Testing virtual try-on...")
    try:
        from services.virtual_tryon import generate_try_on
        
        # Use sample images from unsplash
        body_url = 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400'
        clothing_url = 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400'
        
        result = generate_try_on(
            body_image_url=body_url,
            clothing_image_url=clothing_url
        )
        
        print(f"  - Model: {result.get('model')}")
        print(f"  - Image size: {len(result.get('tryon_image', ''))} bytes")
        print("✓ Virtual try-on works")
        return True
    except Exception as e:
        print(f"✗ Virtual try-on failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("Try On Feature Test Suite")
    print("=" * 60)
    
    results = {
        "health": test_health(),
        "products": test_products(),
        "analyzer": test_clothing_analyzer(),
        "recommendations": test_recommendation_service(),
        "tryon": test_virtual_tryon(),
    }
    
    print("\n" + "=" * 60)
    print("Test Results:")
    print("=" * 60)
    for test_name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{test_name:20s} {status}")
    
    all_passed = all(results.values())
    print("=" * 60)
    print(f"Overall: {'✓ ALL TESTS PASSED' if all_passed else '✗ SOME TESTS FAILED'}")
    print("=" * 60)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
