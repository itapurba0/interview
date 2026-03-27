"""
Resume Parser Service — FastAPI Resume PDF Processing
Handles PDF extraction, skill parsing, and contact information extraction.
"""

import io
import re
import logging
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

# Common technical skills to match against
TECHNICAL_SKILLS = {
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", "kotlin",
    "sql", "nosql", "mongodb", "postgresql", "mysql", "redis", "elasticsearch",
    "react", "angular", "vue", "svelte", "nextjs", "fastapi", "django", "express",
    "aws", "gcp", "azure", "gke", "ecs", "lambda", "kubernetes", "docker", "terraform",
    "git", "gitlab", "github", "bitbucket", "jenkins", "circleci", "github actions",
    "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "nlp",
    "rest", "graphql", "grpc", "soap", "websocket", "http", "https",
    "linux", "windows", "macos", "devops", "ci/cd", "agile", "scrum",
    "ai", "ml", "nlp", "cv", "computer vision", "llm", "gpt", "bert"
}

# Common soft skills
SOFT_SKILLS = {
    "communication", "leadership", "teamwork", "problem solving", "critical thinking",
    "analytical", "project management", "time management", "collaboration", "adaptability",
    "attention to detail", "creativity", "strategic thinking", "presentation", "mentoring"
}


def extract_contact_info(text: str) -> Dict[str, Optional[str]]:
    """
    Extract contact information from resume text.
    Returns dict with 'name', 'email', 'phone', 'github_url', 'linkedin_url'.
    """
    contact_info = {
        "name": None,
        "email": None,
        "phone": None,
        "github_url": None,
        "linkedin_url": None
    }
    
    # Extract name (usually first non-empty line that looks like a name)
    lines = text.split('\n')
    skip_keywords = {
        'objective', 'summary', 'professional', 'experience', 'education', 
        'skills', 'projects', 'portfolio', 'contact', 'phone', 'email',
        'phone:', 'email:', 'linkedin', 'github', 'address', 'location'
    }
    
    for line in lines[:10]:  # Check first 10 lines
        line_clean = line.strip()
        line_lower = line_clean.lower()
        
        # Skip empty lines, section headers, and contact info
        if not line_clean or len(line_clean) > 80:
            continue
        if any(skip in line_lower for skip in skip_keywords):
            continue
        if '@' in line_clean:
            continue
        
        # Look for a line that looks like a name (2+ words with mostly letters)
        # Allow apostrophes, hyphens, and dots for names like O'Brien, Jean-Paul, J.R.R.
        if re.match(r"^[A-Z][\w\s\-'\.]{3,60}[A-Z\w]$", line_clean):
            # Count words - names typically have 2+ words
            words = line_clean.split()
            if len(words) >= 2 and len(words) <= 5:
                # Check that it's not all numbers
                if not all(w.replace('.', '').isdigit() for w in words):
                    contact_info["name"] = line_clean
                    break
    
    # If no name found yet, try to extract from "Name:" pattern
    if not contact_info["name"]:
        name_match = re.search(r"(?:Name|Candidate|Full\s+Name)\s*[:\-]?\s*([A-Z][A-Za-z\s\-\.\']{3,60})", text, re.IGNORECASE)
        if name_match:
            potential_name = name_match.group(1).strip()
            if len(potential_name) < 100:  # Sanity check
                contact_info["name"] = potential_name
    
    # Extract email
    email_match = re.search(r"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", text)
    if email_match:
        contact_info["email"] = email_match.group(1)
    
    # Extract phone
    phone_match = re.search(r"(\+?1?\s*[-.]?\(?[0-9]{3}\)?[-.]?[0-9]{3}[-.]?[0-9]{4})", text)
    if phone_match:
        contact_info["phone"] = phone_match.group(1).strip()
    
    # Extract GitHub URL
    github_match = re.search(r"(?:github\.com|github|github\.io)[:/]*([a-zA-Z0-9_-]*)", text, re.IGNORECASE)
    if github_match and github_match.group(1):
        username = github_match.group(1)
        contact_info["github_url"] = f"https://github.com/{username}"
    
    # Extract LinkedIn URL
    linkedin_match = re.search(r"(?:linkedin\.com/in|linkedin\.com|linkedin)[:/]*([a-zA-Z0-9_-]*)", text, re.IGNORECASE)
    if linkedin_match and linkedin_match.group(1):
        username = linkedin_match.group(1)
        contact_info["linkedin_url"] = f"https://linkedin.com/in/{username}"
    
    return contact_info


def segment_sections(text: str) -> Dict[str, str]:
    """
    Segment resume text into common sections (Experience, Education, Skills, etc.).
    Returns a dictionary mapping section names to their content.
    """
    sections = {}
    section_keywords = {
        "experience": r"(professional\s*experience|work\s*experience|employment|experience)",
        "education": r"(education|academic|degree|university|college)",
        "skills": r"(skills|technical\s*skills|competencies|expertise)",
        "projects": r"(projects|portfolio|achievements)",
        "summary": r"(summary|objective|professional\s*summary|about)"
    }
    
    # Normalize text
    text_lower = text.lower()
    
    # Find section boundaries
    section_positions = {}
    for section_name, pattern in section_keywords.items():
        match = re.search(pattern, text_lower)
        if match:
            section_positions[section_name] = match.start()
    
    # Sort by position and extract content
    sorted_sections = sorted(section_positions.items(), key=lambda x: x[1])
    for i, (section_name, start_pos) in enumerate(sorted_sections):
        end_pos = sorted_sections[i + 1][1] if i + 1 < len(sorted_sections) else len(text)
        sections[section_name] = text[start_pos:end_pos]
    
    return sections


def extract_skills(text: str) -> tuple[List[str], List[str]]:
    """
    Extract technical and soft skills from resume text.
    Returns (technical_skills, soft_skills) as lists.
    """
    text_lower = text.lower()
    
    technical_found = []
    soft_found = []
    
    # Match technical skills
    for skill in TECHNICAL_SKILLS:
        if re.search(rf"\b{re.escape(skill)}\b", text_lower):
            technical_found.append(skill.title())
    
    # Match soft skills
    for skill in SOFT_SKILLS:
        if re.search(rf"\b{re.escape(skill)}\b", text_lower):
            soft_found.append(skill.title())
    
    return list(set(technical_found)), list(set(soft_found))


def extract_experience_years(text: str) -> Optional[float]:
    """
    Extract total years of experience from resume text.
    Looks for patterns like "X years of experience", "X+ years", "20XX-20XX", etc.
    Returns float value or None if not found.
    """
    # Pattern: "X years" or "X+ years"
    years_match = re.search(r"(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)", text.lower())
    if years_match:
        try:
            return float(years_match.group(1))
        except ValueError:
            pass
    
    # Pattern: date ranges (e.g., 2015-2023)
    date_matches = re.findall(r"(20\d{2})\s*[-–]\s*(20\d{2}|present|current)", text.lower())
    if date_matches:
        years_list = []
        for start_year, end_year in date_matches:
            start = int(start_year)
            if end_year.lower() in ["present", "current"]:
                end = 2026  # Current year
            else:
                try:
                    end = int(end_year)
                except ValueError:
                    continue
            years_list.append(end - start)
        
        if years_list:
            return float(sum(years_list) / len(years_list))
    
    return None


def extract_education(text: str) -> Optional[Dict[str, Any]]:
    """
    Extract education information from resume text.
    Looks for degree types (Bachelor, Master, PhD, etc.) and institution names.
    Returns a dictionary with education details or None.
    """
    education_section = {}
    
    # Look for degree types
    degree_patterns = {
        "bachelor": r"\b(b\.?s\.?|bachelor[\'s]*|ba|bs|beng)\b",
        "master": r"\b(m\.?s\.?|master[\'s]*|ma|meng|mba)\b",
        "phd": r"\b(phd|p\.?h\.?d\.?|doctorate)\b",
        "associate": r"\b(associate[\'s]*|aa|as)\b"
    }
    
    text_lower = text.lower()
    degrees = []
    
    for degree_name, pattern in degree_patterns.items():
        if re.search(pattern, text_lower):
            degrees.append(degree_name)
    
    if degrees:
        education_section["degrees"] = degrees
    
    # Look for university/institution names (heuristic: capitalized words after location keywords)
    university_match = re.search(r"(?:university|college|institute|school)\s*(?:of\s*)?([A-Z][^,\n]*)", text)
    if university_match:
        education_section["institution"] = university_match.group(1).strip()
    
    return education_section if education_section else None


def parse_resume_pdf(file_bytes: bytes) -> Dict[str, Any]:
    """
    Parse resume PDF and extract structured information.
    
    Args:
        file_bytes: Raw bytes of the PDF file
        
    Returns:
        Dictionary containing:
        - resume_text: Full extracted text
        - name: Extracted candidate name
        - email: Extracted email address
        - phone: Extracted phone number
        - github_url: Extracted GitHub profile URL
        - linkedin_url: Extracted LinkedIn profile URL
        - technical_skills: List of technical skills found
        - soft_skills: List of soft skills found
        - experience_years: Float representing approximate years of experience
        - education: Dictionary with education details
        - overall_score: Integer (0-100) based on completeness
    """
    try:
        import pdfplumber
    except ImportError:
        logger.error("pdfplumber not installed. Install with: pip install pdfplumber")
        raise ImportError("pdfplumber is required for PDF parsing")
    
    try:
        # Extract text from PDF
        pdf_file = io.BytesIO(file_bytes)
        resume_text = ""
        
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    resume_text += page_text + "\n"
        
        # Normalize whitespace
        resume_text = " ".join(resume_text.split())
        
        # Segment sections
        sections = segment_sections(resume_text)
        
        # Extract components
        contact_info = extract_contact_info(resume_text)
        technical_skills, soft_skills = extract_skills(resume_text)
        experience_years = extract_experience_years(resume_text)
        education = extract_education(resume_text)
        
        # Calculate overall score (0-100)
        score = 0
        if resume_text:
            score += min(20, len(resume_text) // 500)  # Up to 20 for text length
        if technical_skills:
            score += min(30, len(technical_skills) * 3)  # Up to 30 for technical skills
        if soft_skills:
            score += min(20, len(soft_skills) * 3)  # Up to 20 for soft skills
        if experience_years:
            score += min(20, int(experience_years * 2))  # Up to 20 for experience
        if education:
            score += 10  # Up to 10 for education
        
        overall_score = min(100, score)
        
        return {
            "resume_text": resume_text,
            "name": contact_info.get("name"),
            "email": contact_info.get("email"),
            "phone": contact_info.get("phone"),
            "github_url": contact_info.get("github_url"),
            "linkedin_url": contact_info.get("linkedin_url"),
            "technical_skills": technical_skills,
            "soft_skills": soft_skills,
            "experience_years": experience_years,
            "education": education,
            "overall_score": overall_score
        }
    
    except Exception as e:
        logger.error(f"Error parsing resume PDF: {str(e)}")
        raise

