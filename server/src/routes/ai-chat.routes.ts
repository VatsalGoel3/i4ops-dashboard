import { Router } from 'express';
import { Request, Response } from 'express';
import axios from 'axios';
import { Logger } from '../infrastructure/logger';

const router = Router();
const logger = new Logger('AIChatController');

// Ollama API configuration
const OLLAMA_HOST = '100.71.251.12';
const OLLAMA_PORT = 11434;
const OLLAMA_BASE_URL = `http://${OLLAMA_HOST}:${OLLAMA_PORT}`;

// Available models mapping
const AVAILABLE_MODELS = {
  'i4cybersecv2': 'i4cybersecv2:latest',
  'i4compliance1': 'i4compliance1:latest', 
  'llama3': 'llama3:latest',
  'i4cybersecv1': 'i4cybersecv1:latest'
} as const;

interface ChatRequest {
  message: string;
  model?: keyof typeof AVAILABLE_MODELS;
  conversationId?: string;
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
  context?: number[];
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

// Store conversation contexts in memory (in production, use Redis or DB)
const conversationContexts = new Map<string, number[]>();

/**
 * POST /api/ai-chat
 * Send message to AI model and get response
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, model = 'i4cybersecv2', conversationId }: ChatRequest = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Message is required and must be a non-empty string' 
      });
    }

    if (model && !(model in AVAILABLE_MODELS)) {
      return res.status(400).json({ 
        error: 'Invalid model',
        availableModels: Object.keys(AVAILABLE_MODELS)
      });
    }

    const selectedModel = AVAILABLE_MODELS[model];
    
    // Get conversation context if provided
    const context = conversationId ? conversationContexts.get(conversationId) : undefined;

    const ollamaRequest: OllamaGenerateRequest = {
      model: selectedModel,
      prompt: message.trim(),
      stream: false,
      ...(context && { context })
    };

    logger.info(`AI Chat request`, { 
      model: selectedModel, 
      messageLength: message.length,
      hasContext: !!context,
      conversationId 
    });

    const startTime = Date.now();

    // Call Ollama API
    const response = await axios.post<OllamaGenerateResponse>(
      `${OLLAMA_BASE_URL}/api/generate`,
      ollamaRequest,
      {
        timeout: 120000, // 2 minute timeout for large models
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const duration = Date.now() - startTime;

    // Store context for conversation continuity
    if (conversationId && response.data.context) {
      conversationContexts.set(conversationId, response.data.context);
    }

    logger.info(`AI Chat response generated`, {
      model: selectedModel,
      responseLength: response.data.response.length,
      duration,
      conversationId
    });

    res.json({
      response: response.data.response,
      model: selectedModel,
      conversationId,
      metadata: {
        duration,
        totalDuration: response.data.total_duration,
        loadDuration: response.data.load_duration,
        promptEvalCount: response.data.prompt_eval_count,
        evalCount: response.data.eval_count,
        createdAt: response.data.created_at
      }
    });

  } catch (error) {
    logger.error('AI Chat request failed', error);

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
          error: 'AI service unavailable',
          details: 'Could not connect to Ollama service on u5'
        });
      }
      
      if (error.response?.status === 404) {
        return res.status(400).json({ 
          error: 'Model not found',
          details: 'The requested model is not available on the AI service'
        });
      }

      if (error.code === 'ECONNABORTED') {
        return res.status(408).json({ 
          error: 'Request timeout',
          details: 'AI model took too long to respond'
        });
      }
    }

    res.status(500).json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred while processing your request'
    });
  }
});

/**
 * GET /api/ai-chat/models
 * Get available AI models
 */
router.get('/models', async (req: Request, res: Response) => {
  try {
    // Get models from Ollama
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 10000
    });

    const ollamaModels = response.data.models || [];
    
    res.json({
      availableModels: Object.keys(AVAILABLE_MODELS),
      modelDetails: AVAILABLE_MODELS,
      ollamaModels: ollamaModels.map((m: any) => ({
        name: m.name,
        size: m.size,
        modified: m.modified_at
      }))
    });

  } catch (error) {
    logger.error('Failed to fetch AI models', error);
    
    // Fallback to our known models if Ollama is unavailable
    res.json({
      availableModels: Object.keys(AVAILABLE_MODELS),
      modelDetails: AVAILABLE_MODELS,
      error: 'Could not fetch live model status from AI service'
    });
  }
});

/**
 * DELETE /api/ai-chat/conversation/:id
 * Clear conversation context
 */
router.delete('/conversation/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (conversationContexts.has(id)) {
    conversationContexts.delete(id);
    logger.info(`Conversation context cleared`, { conversationId: id });
  }
  
  res.json({ success: true });
});

/**
 * GET /api/ai-chat/health
 * Check AI service health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 5000
    });

    res.json({
      status: 'healthy',
      ollamaHost: OLLAMA_HOST,
      modelsAvailable: response.data.models?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      ollamaHost: OLLAMA_HOST,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 