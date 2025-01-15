import redis from "../config/redis";
import { getDocument } from "pdfjs-dist";
import { GoogleGenerativeAI } from "@google/generative-ai";

const AI_MODEL = "gemini-pro";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const aiModel = genAI.getGenerativeModel({ model: AI_MODEL });

export const extractTextFromPDF = async (fileKey: string) => {
  try {
    const fileData = await redis.get(fileKey);
    if (!fileData) {
      throw new Error("Arquivo não encontrado");
    }

    let fileBuffer: Uint8Array;
    if (Buffer.isBuffer(fileData)) {
      fileBuffer = new Uint8Array(fileData);
    } else if (typeof fileData === "object" && fileData !== null) {
      // check if the the object has the expected structure
      const bufferData = fileData as { type?: string; data?: number[] };
      if (bufferData.type === "Buffer" && Array.isArray(bufferData.data)) {
        fileBuffer = new Uint8Array(bufferData.data);
      } else {
        throw new Error("Dados do arquivo inválidos");
      }
    } else {
      throw new Error("Dados do arquivo inválidos");
    }

    const pdf = await getDocument({ data: fileBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return text;
  } catch (error) {
    console.log(error);
    throw new Error(
      `Falha ao extrair texto do PDF. Erro: ${JSON.stringify(error)}`
    );
  }
};

export const detectContractType = async (
  contractText: string
): Promise<string> => {
  const prompt = `
    Analise o seguinte texto do contrato e determine qual é o tipo de contrato.
    Forneça apenas o tipo de contrato como uma única string (ex: "Emprego", "Acordo de Confidencialidade", "Vendas", "Locação", etc.).
    Não inclua nenhuma explicação ou texto adicional.

    Texto do contrato:
    ${contractText.substring(0, 2000)}
  `;

  const results = await aiModel.generateContent(prompt);
  const response = results.response;
  return response.text().trim();
};

export const analyzeContractWithAI = async (
  contractText: string,
  tier: "free" | "premium",
  contractType: string
) => {
  let prompt;
  if (tier === "premium") {
    prompt = `
    Analise o seguinte contrato de ${contractType} e forneça:
    1. Uma lista de pelo menos 10 riscos potenciais para a parte que recebe o contrato, cada um com uma breve explicação e nível de severidade (baixo, médio, alto).
    2. Uma lista de pelo menos 10 oportunidades ou benefícios potenciais para a parte receptora, cada um com uma breve explicação e nível de impacto (baixo, médio, alto).
    3. Um resumo abrangente do contrato, incluindo termos e condições principais.
    4. Quaisquer recomendações para melhorar o contrato da perspectiva da parte receptora.
    5. Uma lista de cláusulas-chave no contrato.
    6. Uma avaliação da conformidade legal do contrato.
    7. Uma lista de pontos de negociação potenciais.
    8. A duração ou prazo do contrato, se aplicável.
    9. Um resumo das condições de rescisão, se aplicável.
    10. Uma análise dos termos financeiros ou estrutura de compensação, se aplicável.
    11. Quaisquer métricas de desempenho ou KPIs mencionados, se aplicável.
    12. Um resumo de quaisquer cláusulas específicas relevantes para este tipo de contrato.
    13. Uma pontuação geral de 1 a 100, sendo 100 a mais alta. Esta pontuação representa a favorabilidade geral do contrato com base nos riscos e oportunidades identificados.

    Format your response as a JSON object with the following structure:
    {
      "risks": [{"risk": "Descrição do risco", "explanation": "Breve explicação", "severity": "baixo|médio|alto"}],
      "opportunities": [{"opportunity": "Descrição da oportunidade", "explanation": "Breve explicação", "impact": "baixo|médio|alto"}],
      "summary": "Resumo completo do contrato",
      "recommendations": ["Recomendação 1", "Recomendação 2", ...],
      "keyClauses": ["Cláusula 1", "Cláusula 2", ...],
      "legalCompliance": "Avaliação da conformidade legal",
      "negotiationPoints": ["Ponto 1", "Ponto 2", ...],
      "contractDuration": "Duração do contrato, se aplicável",
      "terminationConditions": "Resumo das condições de rescisão, se aplicável",
      "overallScore": "Pontuação geral de 1 a 100",
      "financialTerms": {
        "description": "Visão geral dos termos financeiros",
        "details": ["Detalhe 1", "Detalhe 2", ...]
      },
      "performanceMetrics": ["Métrica 1", "Métrica 2", ...],
      "specificClauses": "Resumo das cláusulas específicas para este tipo de contrato"
    }
      `;
  } else {
    prompt = `
    Analise o seguinte contrato de ${contractType} e forneça:
    1. Uma lista de pelo menos 5 riscos potenciais para a parte que recebe o contrato, cada um com uma breve explicação e nível de severidade (baixo, médio, alto).
    2. Uma lista de pelo menos 5 oportunidades ou benefícios potenciais para a parte receptora, cada um com uma breve explicação e nível de impacto (baixo, médio, alto).
    3. Um resumo breve do contrato
    4. Uma pontuação geral de 1 a 100, sendo 100 a mais alta. Esta pontuação representa a favorabilidade geral do contrato com base nos riscos e oportunidades identificados.

     {
      "risks": [{"risk": "Risk description", "explanation": "Brief explanation"}],
      "opportunities": [{"opportunity": "Opportunity description", "explanation": "Brief explanation"}],
      "summary": "Brief summary of the contract",
      "overallScore": "Overall score from 1 to 100"
    }
`;
  }

  prompt += `
    Important: Provide only the JSON object in your response, without any additional text or formatting. 
    
    
    Contract text:
    ${contractText}
    `;

  const results = await aiModel.generateContent(prompt);
  const response = await results.response;
  let text = response.text();

  // remove any markdown formatting
  text = text.replace(/```json\n?|\n?```/g, "").trim();

  try {
    // Attempt to fix common JSON errors
    text = text.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); // Ensure all keys are quoted
    text = text.replace(/:\s*"([^"]*)"([^,}\]])/g, ': "$1"$2'); // Ensure all string values are properly quoted
    text = text.replace(/,\s*}/g, "}"); // Remove trailing commas

    const analysis = JSON.parse(text);
    return analysis;
  } catch (error) {
    console.log("Error parsing JSON:", error);
  }

  interface IRisk {
    risk: string;
    explanation: string;
  }

  interface IOpportunity {
    opportunity: string;
    explanation: string;
  }

  interface FallbackAnalysis {
    risks: IRisk[];
    opportunities: IOpportunity[];
    summary: string;
  }

  const fallbackAnalysis: FallbackAnalysis = {
    risks: [],
    opportunities: [],
    summary: "Error analyzing contract",
  };

  // Extract risks
  const risksMatch = text.match(/"risks"\s*:\s*\[([\s\S]*?)\]/);
  if (risksMatch) {
    fallbackAnalysis.risks = risksMatch[1].split("},").map((risk) => {
      const riskMatch = risk.match(/"risk"\s*:\s*"([^"]*)"/);
      const explanationMatch = risk.match(/"explanation"\s*:\s*"([^"]*)"/);
      return {
        risk: riskMatch ? riskMatch[1] : "Unknown",
        explanation: explanationMatch ? explanationMatch[1] : "Unknown",
      };
    });
  }

  //Extact opportunities
  const opportunitiesMatch = text.match(/"opportunities"\s*:\s*\[([\s\S]*?)\]/);
  if (opportunitiesMatch) {
    fallbackAnalysis.opportunities = opportunitiesMatch[1]
      .split("},")
      .map((opportunity) => {
        const opportunityMatch = opportunity.match(
          /"opportunity"\s*:\s*"([^"]*)"/
        );
        const explanationMatch = opportunity.match(
          /"explanation"\s*:\s*"([^"]*)"/
        );
        return {
          opportunity: opportunityMatch ? opportunityMatch[1] : "Unknown",
          explanation: explanationMatch ? explanationMatch[1] : "Unknown",
        };
      });
  }

  // Extract summary
  const summaryMatch = text.match(/"summary"\s*:\s*"([^"]*)"/);
  if (summaryMatch) {
    fallbackAnalysis.summary = summaryMatch[1];
  }

  return fallbackAnalysis;
};
