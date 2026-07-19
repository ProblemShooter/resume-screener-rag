import re

def clean_text(text: str) -> str:
    """
    Cleans raw text extracted from resumes/CSVs.
    Removes weird characters, redundant spaces, and normalizes formatting.
    """
    if not text:
        return ""
    # Remove non-ascii characters (like NaÃ¯ve Bayes, etc.)
    text = text.encode("ascii", errors="ignore").decode("ascii")
    # Replace multiple newlines or tabs with standard spacing
    text = re.sub(r'[\r\n\t]+', '\n', text)
    # Remove multiple spaces
    text = re.sub(r' +', ' ', text)
    return text.strip()

def chunk_resume_by_sections(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[dict]:
    """
    Intelligent section-aware chunker for resumes.
    Tries to detect resume sections like Experience, Projects, Skills, and Education.
    Returns a list of dicts: {"text": chunk_text, "section": section_name, "chunk_id": int}
    """
    text = clean_text(text)
    
    # Section header markers
    section_patterns = {
        "skills": r'\b(skills|technical skills|technologies|expertise|core competencies)\b',
        "experience": r'\b(experience|work experience|employment history|work history|professional experience|experience details|work experince)\b',
        "education": r'\b(education|education details|academic qualification|academic details|degrees)\b',
        "projects": r'\b(projects|personal projects|key projects|academic projects)\b',
        "certifications": r'\b(certifications|trainings|certifications and training|licences)\b',
        "summary": r'\b(summary|profile summary|objective|about me|career objective)\b'
    }
    
    # Find all matches of section headers in the text
    section_matches = []
    for section_name, pattern in section_patterns.items():
        for match in re.finditer(pattern, text, re.IGNORECASE):
            section_matches.append({
                "section": section_name,
                "start": match.start(),
                "end": match.end(),
                "matched_text": match.group(0)
            })
            
    # Sort section matches by their position in the text
    section_matches = sorted(section_matches, key=lambda x: x["start"])
    
    chunks = []
    chunk_index = 0
    
    # If no sections are detected, fall back to sliding window chunking
    if not section_matches:
        return fallback_sliding_window(text, "general", chunk_size, overlap)
        
    # Split text by detected sections
    for i in range(len(section_matches)):
        current_match = section_matches[i]
        section_name = current_match["section"]
        start_idx = current_match["start"]
        
        # End index is either the start of the next section or the end of the text
        if i + 1 < len(section_matches):
            end_idx = section_matches[i+1]["start"]
        else:
            end_idx = len(text)
            
        section_text = text[start_idx:end_idx].strip()
        
        if not section_text:
            continue
            
        # If the section text is too long, chunk it further using sliding window
        if len(section_text) > chunk_size:
            sub_chunks = fallback_sliding_window(section_text, section_name, chunk_size, overlap)
            for sub in sub_chunks:
                sub["chunk_id"] = chunk_index
                chunks.append(sub)
                chunk_index += 1
        else:
            chunks.append({
                "text": section_text,
                "section": section_name,
                "chunk_id": chunk_index
            })
            chunk_index += 1
            
    # Also capture the header/intro text before the first section
    if section_matches and section_matches[0]["start"] > 10:
        intro_text = text[0:section_matches[0]["start"]].strip()
        if intro_text:
            sub_chunks = fallback_sliding_window(intro_text, "header", chunk_size, overlap)
            for sub in sub_chunks:
                sub["chunk_id"] = chunk_index
                chunks.append(sub)
                chunk_index += 1
                
    return chunks

def fallback_sliding_window(text: str, section_name: str, chunk_size: int, overlap: int) -> list[dict]:
    """
    Standard sliding window text splitter for fallbacks and sub-chunking.
    """
    chunks = []
    start = 0
    chunk_idx = 0
    text_len = len(text)
    
    if text_len <= chunk_size:
        return [{"text": text, "section": section_name, "chunk_id": chunk_idx}]
        
    while start < text_len:
        end = start + chunk_size
        
        # If we are not at the end of the text, try to find a natural boundary (newline or space)
        if end < text_len:
            # Look for a newline or space within the last 150 characters of the window to split cleanly
            boundary = text.rfind('\n', end - 150, end)
            if boundary == -1:
                boundary = text.rfind(' ', end - 100, end)
            if boundary != -1:
                end = boundary + 1
                
        chunk_text = text[start:end].strip()
        if chunk_text:
            chunks.append({
                "text": chunk_text,
                "section": section_name,
                "chunk_id": chunk_idx
            })
            chunk_idx += 1
            
        start += (chunk_size - overlap)
        if start >= text_len or (end >= text_len):
            break
            
    return chunks
