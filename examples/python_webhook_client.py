#!/usr/bin/env python3
"""
Python client example for CRM PP Webhook Integration
This script demonstrates how to send lead data to the webhook endpoint
"""

import requests
import json


# Configuration
WEBHOOK_URL = "https://crm.promptpersonnel.com/api/method/crm_pp.api.webhook.handle_lead_webhook"
API_KEY = "your_api_key_here"  # Optional, if enabled in settings


def submit_lead(lead_data):
    """
    Submit lead data to the webhook endpoint
    
    Args:
        lead_data (dict): Dictionary containing lead information
        
    Returns:
        dict: Response from the webhook
    """
    
    # Add API key to headers if configured
    headers = {
        "Content-Type": "application/json"
    }
    
    if API_KEY:
        headers["X-API-Key"] = API_KEY
    
    try:
        response = requests.post(
            WEBHOOK_URL,
            json=lead_data,
            headers=headers,
            timeout=30
        )
        
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.RequestException as e:
        return {
            "status": "error",
            "message": str(e)
        }


# Example 1: Corporate Training Lead
def example_corporate_training():
    lead_data = {
        "form_identifier": "corporate_training",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "phone": "+1-555-0123",
        "company": "Acme Corporation",
        "job_title": "HR Manager",
        "no_of_employees": "51-200",
        "message": "Interested in leadership training for management team"
    }
    
    result = submit_lead(lead_data)
    print("Corporate Training Lead Result:")
    print(json.dumps(result, indent=2))
    return result


# Example 2: Permanent Staffing Lead
def example_permanent_staffing():
    lead_data = {
        "form_identifier": "perm_staffing",
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane.smith@techcorp.com",
        "phone": "+1-555-0456",
        "company": "Tech Corp",
        "job_title": "Talent Acquisition Manager",
        "website": "https://techcorp.com",
        "no_of_employees": "201-500",
        "message": "Looking to hire 5 software engineers"
    }
    
    result = submit_lead(lead_data)
    print("\nPermanent Staffing Lead Result:")
    print(json.dumps(result, indent=2))
    return result


# Example 3: Salesforce-style form submission
def example_salesforce_style():
    """
    Example mimicking Salesforce Web-to-Lead form fields
    """
    lead_data = {
        "retURL": "https://example.com/permanent-staffing/thank-you",
        "oid": "00D5g000000abcd",  # Salesforce Org ID
        "00N5g00000JKqLY": "john.doe@example.com",  # Custom field mapping
        "first_name": "John",
        "last_name": "Doe",
        "company": "Example Inc",
        "phone": "+1-555-0789"
    }
    
    result = submit_lead(lead_data)
    print("\nSalesforce-style Lead Result:")
    print(json.dumps(result, indent=2))
    return result


# Example 4: Bulk lead submission
def bulk_submit_leads(leads_list):
    """
    Submit multiple leads
    
    Args:
        leads_list (list): List of lead dictionaries
        
    Returns:
        list: Results for each lead
    """
    results = []
    
    for i, lead in enumerate(leads_list, 1):
        print(f"\nSubmitting lead {i}/{len(leads_list)}...")
        result = submit_lead(lead)
        results.append(result)
        
        if result.get("status") == "success":
            print(f"✓ Success: {result.get('lead_name')} ({result.get('lead_id')})")
        else:
            print(f"✗ Failed: {result.get('message')}")
    
    return results


if __name__ == "__main__":
    print("=" * 60)
    print("CRM PP Webhook Integration - Python Examples")
    print("=" * 60)
    
    # Run examples
    example_corporate_training()
    example_permanent_staffing()
    example_salesforce_style()
    
    # Bulk submission example
    print("\n" + "=" * 60)
    print("Bulk Submission Example")
    print("=" * 60)
    
    bulk_leads = [
        {
            "form_identifier": "corporate_training",
            "first_name": "Alice",
            "last_name": "Johnson",
            "email": "alice@company1.com",
            "company": "Company 1"
        },
        {
            "form_identifier": "corporate_training",
            "first_name": "Bob",
            "last_name": "Williams",
            "email": "bob@company2.com",
            "company": "Company 2"
        }
    ]
    
    bulk_results = bulk_submit_leads(bulk_leads)
    
    # Summary
    successful = sum(1 for r in bulk_results if r.get("status") == "success")
    failed = len(bulk_results) - successful
    
    print("\n" + "=" * 60)
    print(f"Summary: {successful} successful, {failed} failed")
    print("=" * 60)

