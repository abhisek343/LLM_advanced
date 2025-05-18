# LLM_interviewer/server/app/services/resume_analyzer.py

import logging
import re
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple, Any, Set
import asyncio

logger = logging.getLogger(__name__) # Define logger at the top

# --- NLP and Date Libraries ---
try:
    import spacy
    from spacy.matcher import Matcher
    NLP_LOADED = True
    try:
        NLP_MODEL = spacy.load('en_core_web_lg')
        logger.info("Successfully loaded spaCy model 'en_core_web_lg'.")
    except OSError:
        logger.warning("spaCy model 'en_core_web_lg' not found. Trying 'en_core_web_sm'.")
        try:
            NLP_MODEL = spacy.load('en_core_web_sm')
            logger.info("Successfully loaded spaCy model 'en_core_web_sm'.")
        except OSError:
            logger.error("No spaCy models found (en_core_web_lg or en_core_web_sm). Download with: python -m spacy download [model_name]")
            NLP_MODEL = None
            NLP_LOADED = False
    except ImportError: 
         logger.error("Could not load spaCy model due to import error within spaCy itself.")
         NLP_MODEL = None
         NLP_LOADED = False

except ImportError:
    NLP_LOADED = False
    NLP_MODEL = None
    spacy = None
    Matcher = None
    logger.warning("spaCy library not found. Install with 'pip install spacy' and download a model. Skill/Experience extraction will be limited.")

try:
    from dateutil.parser import parse as date_parse
    from dateutil.parser import ParserError as DateParserError
    from dateutil.relativedelta import relativedelta
    DATEUTIL_LOADED = True
except ImportError:
    DATEUTIL_LOADED = False
    DateParserError = Exception 
    logger.warning("python-dateutil library not found. Install with 'pip install python-dateutil'. Experience calculation will be limited.")
# --- End Libraries ---

# --- Constants ---
SKILL_KEYWORDS = [
    "python", "java", "c++", "c#", "javascript", "typescript", "html", "css", "sql", "nosql", "pl/sql",
    "react", "react.js", "angular", "vue", "vue.js", "node.js", "express", "django", "flask", "fastapi", "spring boot", ".net core", "asp.net",
    "mongodb", "postgresql", "mysql", "redis", "oracle database", "sql server", "elasticsearch", "dynamodb", "cassandra",
    "docker", "kubernetes", "k8s", "aws", "azure", "gcp", "google cloud", "amazon web services", "cloudformation", "lambda", "ec2", "s3",
    "terraform", "ansible", "jenkins", "gitlab ci", "github actions", "ci/cd", "puppet", "chef",
    "linux", "unix", "bash", "powershell", "windows server",
    "git", "svn", "jira", "confluence", "agile", "scrum", "kanban", "waterfall",
    "machine learning", "deep learning", "nlp", "natural language processing", "computer vision", "ai", "artificial intelligence",
    "tensorflow", "pytorch", "keras", "scikit-learn", "opencv", "spacy", "nltk",
    "data analysis", "data science", "pandas", "numpy", "scipy", "matplotlib", "seaborn", "power bi", "tableau", "etl", "data warehousing",
    "api design", "restful api", "graphql", "microservices", "distributed systems", "soa", "message queues", "rabbitmq", "kafka",
    "object-oriented programming", "oop", "functional programming", "data structures", "algorithms",
    "cybersecurity", "penetration testing", "network security", "encryption", "iam", "information security",
    "unit testing", "integration testing", "pytest", "junit", "selenium",
    "communication", "teamwork", "problem-solving", "leadership", 
]
SKILL_KEYWORDS_SET = set(s.lower() for s in SKILL_KEYWORDS)

YOE_REGEX = re.compile(r'(\d{1,2})\s*\+?\s+(?:year|yr)s?', re.IGNORECASE)
DATE_RANGE_REGEX = re.compile(
    r'(?:'                                       
        r'(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?)' 
        r'|(\d{1,2})[/-]'                         
    r')?'                                        
    r'\s*(\d{4})'                                
    r'\s*[-\u2013to]+\s*'                         
    r'(?:'                                       
        r'(?:'                                   
            r'(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?)' 
            r'|(\d{1,2})[/-]'                     
        r')?'                                    
        r'\s*(\d{4})'                            
        r'|(Present|Current|Today|Now)'          
    r')',
    re.IGNORECASE
)
MONTH_MAP = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}
# --- End Constants ---


class ResumeAnalyzerService:
    def __init__(self):
        self.nlp = NLP_MODEL 
        self.matcher = None
        if self.nlp:
            self.matcher = Matcher(self.nlp.vocab)
            logger.info("ResumeAnalyzerService initialized with spaCy resources.")
        else:
             logger.warning("ResumeAnalyzerService initialized WITHOUT spaCy resources.")

    def _parse_date(self, month_str_name: Optional[str], month_str_num: Optional[str], year_str: Optional[str]) -> Optional[datetime]:
        if not year_str: return None
        try:
            year = int(year_str)
            month = 1 
            if month_str_name:
                month = MONTH_MAP.get(month_str_name[:3].lower(), 1)
            elif month_str_num:
                month_num = int(month_str_num)
                if 1 <= month_num <= 12:
                    month = month_num
            return datetime(year, month, 1, tzinfo=timezone.utc)
        except (ValueError, TypeError) as e:
            logger.debug(f"Could not parse date components: MonthName='{month_str_name}', MonthNum='{month_str_num}', Year='{year_str}'. Error: {e}")
            return None

    async def extract_skills(self, resume_text: str) -> List[str]:
        if not resume_text: return []
        logger.debug("Extracting skills...")
        extracted_skills: Set[str] = set() 

        text_lower = resume_text.lower()
        for skill in SKILL_KEYWORDS_SET:
            try:
                if re.search(r'\b' + re.escape(skill) + r'\b', text_lower):
                    extracted_skills.add(skill) 
            except re.error as re_err: 
                 logger.warning(f"Regex error matching skill '{skill}': {re_err}")

        if self.nlp:
            try:
                doc = self.nlp(resume_text)
                common_non_skills = {'inc', 'llc', 'ltd', 'corp', 'corporation', 'university', 'college', 'institute', 'company'}
                for ent in doc.ents:
                    if ent.label_ in ["ORG", "PRODUCT"]: 
                        ent_text_lower = ent.text.lower().strip()
                        if ent_text_lower in SKILL_KEYWORDS_SET or \
                           (len(ent_text_lower) > 1 and ' ' in ent_text_lower and ent_text_lower not in common_non_skills):
                             extracted_skills.add(ent_text_lower)
            except Exception as e:
                logger.error(f"Error during spaCy processing for skills: {e}", exc_info=True)

        final_skills = sorted([s for s in extracted_skills if s]) 
        logger.info(f"Extracted skills: {len(final_skills)} unique skills found.")
        return final_skills


    async def extract_experience_years(self, resume_text: str) -> Optional[float]:
        if not resume_text or not DATEUTIL_LOADED:
            return None

        logger.debug("Extracting experience years...")
        total_months = 0
        max_explicit_yoe = 0.0
        processed_text_segments = set() 

        try:
            explicit_matches = YOE_REGEX.findall(resume_text)
            if explicit_matches:
                max_explicit_yoe = max(float(y) for y in explicit_matches)
                logger.debug(f"Found max explicit YoE mention: {max_explicit_yoe}")
        except Exception as e:
            logger.warning(f"Error parsing explicit YoE mentions: {e}")

        now = datetime.now(timezone.utc)
        durations_months = []

        for match in DATE_RANGE_REGEX.finditer(resume_text):
            full_match_text = match.group(0)
            if full_match_text in processed_text_segments:
                continue 
            processed_text_segments.add(full_match_text)

            start_month_name, start_month_num, start_year, \
            end_month_name, end_month_num, end_year, present_keyword = match.groups()

            start_date = self._parse_date(start_month_name, start_month_num, start_year)
            end_date = None

            if present_keyword:
                end_date = now
            else:
                end_date = self._parse_date(end_month_name, end_month_num, end_year)

            if start_date and end_date and end_date >= start_date:
                try:
                    delta = relativedelta(end_date, start_date)
                    duration_months = (delta.years * 12 + delta.months) + 1
                    durations_months.append(duration_months)
                    logger.debug(f"Parsed range: '{full_match_text}' -> Start: {start_date.date()}, End: {end_date.date()}, Duration: {duration_months} months")
                except Exception as e:
                    logger.warning(f"Error calculating duration for range '{full_match_text}': {e}")
            elif start_date:
                 logger.debug(f"Parsed range '{full_match_text}' but end date was invalid or before start date.")

        if durations_months:
            total_months = sum(durations_months)
            calculated_yoe = total_months / 12.0
            logger.debug(f"Total calculated YoE from date ranges (summed, may overlap): {calculated_yoe:.2f}")
        else:
            calculated_yoe = 0.0

        final_yoe = max(max_explicit_yoe, calculated_yoe)

        logger.info(f"Estimated experience years: {final_yoe:.2f}")
        return round(final_yoe, 2) if final_yoe > 0.01 else None


    async def analyze_resume(self, resume_text: str) -> Dict[str, Any]:
        if not resume_text:
             return {"extracted_skills_list": [], "estimated_yoe": None}

        logger.info("Performing comprehensive resume analysis...")
        skills = await self.extract_skills(resume_text)
        experience_years = await self.extract_experience_years(resume_text)

        analysis_result = {
            "extracted_skills_list": skills,
            "estimated_yoe": experience_years,
        }
        logger.info("Resume analysis complete.")
        return analysis_result

resume_analyzer_service = ResumeAnalyzerService()
