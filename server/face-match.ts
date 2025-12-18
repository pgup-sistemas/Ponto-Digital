// Face matching utility
// In production, this would use a real face recognition library like face-api.js or ArcFace
// For this implementation, we simulate the embedding generation and matching

const FACE_MATCH_THRESHOLD = 0.35;

export function generateFaceEmbedding(imageBase64: string): number[] {
  // Simulate generating a 512-dimensional face embedding
  // In production, this would use ArcFace or similar model
  const seed = hashString(imageBase64);
  const embedding: number[] = [];
  
  for (let i = 0; i < 512; i++) {
    // Generate pseudo-random but deterministic values based on image
    embedding.push(Math.sin(seed * (i + 1)) * 0.5 + 0.5);
  }
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

export function calculateL2Distance(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error("Embeddings must have same dimension");
  }
  
  let sum = 0;
  for (let i = 0; i < embedding1.length; i++) {
    const diff = embedding1[i] - embedding2[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

export function matchFace(
  capturedImageBase64: string, 
  storedEmbeddingJson: string
): { matched: boolean; score: number } {
  try {
    const capturedEmbedding = generateFaceEmbedding(capturedImageBase64);
    const storedEmbedding = JSON.parse(storedEmbeddingJson) as number[];
    
    const distance = calculateL2Distance(capturedEmbedding, storedEmbedding);
    
    // Convert distance to similarity score (lower distance = higher score)
    // L2 distance of 0 = perfect match (score 1.0)
    // L2 distance >= threshold = no match (score <= 0.65)
    const score = Math.max(0, 1 - distance);
    const matched = distance <= FACE_MATCH_THRESHOLD;
    
    return { matched, score };
  } catch (error) {
    console.error("Face matching error:", error);
    return { matched: false, score: 0 };
  }
}

export function validateGPS(
  latitude?: number,
  longitude?: number,
  accuracy?: number
): boolean {
  // Basic GPS validation
  // In production, you might validate against allowed locations
  if (latitude === undefined || longitude === undefined) {
    return false;
  }
  
  // Check if coordinates are valid
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  
  // Check if accuracy is acceptable (within 100 meters)
  if (accuracy !== undefined && accuracy > 100) {
    return false;
  }
  
  return true;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < Math.min(str.length, 1000); i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
