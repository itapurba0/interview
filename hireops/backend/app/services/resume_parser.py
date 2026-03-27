"""
Resume Parser Service — FastAPI Resume PDF Processing & Job Matching
Handles PDF extraction, skill parsing, and job-candidate matching.
"""

import io
import re
from typing import Optional, List, Dict, Any
import logging

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
            "technical_skills": technical_skills,
            "soft_skills": soft_skills,
            "experience_years": experience_years,
            "education": education,
            "overall_score": overall_score
        }
    
    except Exception as e:
        logger.error(f"Error parsing resume PDF: {str(e)}")
        raise


def calculate_job_match(candidate_data: Dict[str, Any], job_description: str) -> int:
    """
    Calculate job-candidate match score based on skills and experience.
    
    Args:
        candidate_data: Dictionary with parsed candidate info (from parse_resume_pdf output)
        job_description: Job description text
        
    Returns:
        Integer score from 0 to 100 representing match quality
    """
    job_desc_lower = job_description.lower()
    score = 0
    
    # Skill matching (up to 70 points)
    candidate_technical_skills = [s.lower() for s in candidate_data.get("technical_skills", [])]
    candidate_soft_skills = [s.lower() for s in candidate_data.get("soft_skills", [])]
    
    if candidate_technical_skills:
        skill_matches = sum(1 for skill in candidate_technical_skills 
                           if skill in job_desc_lower)
        if skill_matches > 0:
            tech_match_ratio = skill_matches / len(candidate_technical_skills)
            score += int(50 * tech_match_ratio)  # Up to 50 for technical skills
        
        # Bonus for multiple matching technical skills
        if skill_matches >= 3:
            score += 15
        elif skill_matches >= 2:
            score += 10
    
    # Soft skills bonus (up to 10 points)
    if candidate_soft_skills:
        soft_matches = sum(1 for skill in candidate_soft_skills 
                          if skill in job_desc_lower)
        if soft_matches > 0:
            score += min(10, soft_matches * 3)
    
    # Experience requirement check (up to 20 points)
    experience_years = candidate_data.get("experience_years")
    if experience_years:
        # Look for experience requirement in job description
        exp_req_match = re.search(r"(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)", job_desc_lower)
        if exp_req_match:
            required_years = int(exp_req_match.group(1))
            if experience_years >= required_years:
                score += 20
            elif experience_years >= required_years * 0.7:
                score += 10
        else:
            # No specific requirement, give points for having experience
            score += min(20, int(experience_years * 2))
    
    return min(100, max(0, score))
