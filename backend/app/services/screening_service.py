import re

def redact_pii(text: str, candidate_name: str = None) -> str:
    """
    Redacts PII (Personally Identifiable Information) from the resume text to enforce blind screening.
    Removes:
    - Emails
    - Phone numbers
    - Candidate Name (if provided)
    - Gender Pronouns (he, she, him, her, etc.)
    - Common university pattern terms
    """
    if not text:
        return ""
        
    redacted = text
    
    # 1. Redact Candidate Name if provided
    if candidate_name:
        # Escape any special characters in the name and replace with [REDACTED_NAME]
        name_parts = candidate_name.split()
        # Redact full name
        redacted = re.sub(re.escape(candidate_name), "[REDACTED_NAME]", redacted, flags=re.IGNORECASE)
        # Redact individual name parts (if long enough to avoid false positives)
        for part in name_parts:
            if len(part) > 2 and part.lower() not in ["singh", "kumar", "devi", "sharma"]:  # Skip common Indian generic middle/last names to avoid over-redacting
                redacted = re.sub(r'\b' + re.escape(part) + r'\b', "[REDACTED_NAME]", redacted, flags=re.IGNORECASE)

    # 2. Redact Email Addresses
    email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    redacted = re.sub(email_pattern, "[REDACTED_EMAIL]", redacted)
    
    # 3. Redact Phone Numbers (supports various formats: +91 9999999999, 09876-971076, +1 (555) 019-2834, etc.)
    phone_pattern = r'\b(?:\+\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3}[-.\s]?\d{3,4}\b|\b\d{10,12}\b|\b\d{5}[-.\s]\d{6}\b'
    redacted = re.sub(phone_pattern, "[REDACTED_PHONE]", redacted)
    
    # 4. Redact Gender Pronouns
    pronoun_pattern = r'\b(he|she|him|her|his|hers|himself|herself|mrs|mr|ms|miss)\b'
    redacted = re.sub(pronoun_pattern, "[REDACTED_PRONOUN]", redacted, flags=re.IGNORECASE)
    
    # 5. Redact University/College Names
    # Matches patterns like "IIT Delhi", "Stanford University", "Rayat and Bahra Institute of Engineering"
    univ_pattern = r'\b[A-Za-z0-9&.\- ]{2,50} (University|College|Institute of Technology|Institute|Academy|School)\b'
    redacted = re.sub(univ_pattern, "[REDACTED_INSTITUTION]", redacted, flags=re.IGNORECASE)
    
    # Clean up double spacing created by replacements
    redacted = re.sub(r'\s+', ' ', redacted)
    
    return redacted
