# Pearl Abyss - Global Coding Standards
*These rules must be followed by Kenzo, Leo, Raven, and Cipher across all projects.*

## 1. Architecture (Leo)
- Always prioritize modularity.
- Ensure API endpoints are strictly defined before Kenzo begins coding.

## 2. Engineering (Kenzo)
- Code must be heavily commented for elite readability.
- Prioritize Python, FastAPI, and Next.js unless otherwise specified.
- Error handling must be exhaustive. No silent failures.

## 3. Security (Raven)
- All databases must use Row Level Security (RLS) if applicable.
- Passwords and keys must NEVER be hardcoded. Always use `.env`.

## 4. DevOps (Cipher)
- All projects must include a `Dockerfile`.
- Ensure `.dockerignore` and `.gitignore` are always present.
