const INJECTION_PATTERNS = [
    /note to ai:/gi,
    /ignore previous/gi,
    /from now on/gi,
    /new rule:/gi,
    /you are now/gi,
    /act as/gi,
    /pretend/gi,
    /jailbreak/gi,
    /dan:/gi,
    /always say/gi,
    /never say/gi,
    /override/gi,
    /forget your instructions/gi,
  ]
  
  export function sanitizeAdminInput(text: string): string {
    let clean = text
    for (const pattern of INJECTION_PATTERNS) {
      clean = clean.replace(pattern, '[removed]')
    }
    // Limit to 500 chars for project descriptions
    return clean.slice(0, 500).trim()
  }
  
  export function sanitizeProjectData(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data }
    // Sanitize text fields that could reach AI context
    const textFields = ['projectName', 'constructionStatus', 'microMarket']
    for (const field of textFields) {
      if (typeof sanitized[field] === 'string') {
        sanitized[field] = sanitizeAdminInput(sanitized[field])
      }
    }
    if (Array.isArray(sanitized.amenities)) {
      sanitized.amenities = sanitized.amenities.map((a: string) =>
        sanitizeAdminInput(a)
      )
    }
    return sanitized
  }