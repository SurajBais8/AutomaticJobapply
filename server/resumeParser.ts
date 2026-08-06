import fs from 'fs';
import path from 'path';

export interface ParsedResume {
  text: string;
  skills: string[];
  email?: string;
  phone?: string;
  candidateName?: string;
}

const COMMON_SKILLS = [
  'Java', 'Spring Boot', 'React', 'TypeScript', 'JavaScript', 'Node.js', 'Express',
  'Python', 'FastAPI', 'Django', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Docker',
  'Kubernetes', 'AWS', 'Git', 'HTML', 'CSS', 'Tailwind', 'Redux', 'REST API',
  'GraphQL', 'C++', 'C#', '.NET', 'Kafka', 'Microservices', 'CI/CD', 'JUnit', 'Jest'
];

export async function parseResumeFile(filePath: string): Promise<ParsedResume> {
  const ext = path.extname(filePath).toLowerCase();
  let text = '';

  try {
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfModule = await import('pdf-parse');
      const parseFunc = (pdfModule as any).default || pdfModule;
      const parsed = await parseFunc(dataBuffer);
      text = parsed.text || '';
    } else {
      // Plain text or fallback
      text = fs.readFileSync(filePath, 'utf-8');
    }
  } catch (err) {
    console.error('Failed to parse resume text:', err);
    text = `Resume File (${path.basename(filePath)})`;
  }

  // Extract skills via keyword matching
  const foundSkills = new Set<string>();
  COMMON_SKILLS.forEach(skill => {
    const regex = new RegExp(`\\b${skill.replace('+', '\\+')}\\b`, 'i');
    if (regex.test(text)) {
      foundSkills.add(skill);
    }
  });

  // Extract email
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
  const emailMatch = text.match(emailRegex);

  // Extract phone
  const phoneRegex = /(?:(?:\+|00)\d{1,3}[\s-]*)?(?:\(?\d{2,4}\)?[\s-]*)?\d{3,4}[\s-]*\d{3,4}/;
  const phoneMatch = text.match(phoneRegex);

  return {
    text: text.slice(0, 3000), // Trim for preview
    skills: Array.from(foundSkills),
    email: emailMatch ? emailMatch[0] : undefined,
    phone: phoneMatch ? phoneMatch[0] : undefined
  };
}
