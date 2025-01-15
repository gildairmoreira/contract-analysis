import redis from "../config/redis";



export const extractTextFromPDF = async (fileKey: string) => {
  try {
    const fileData = await redis.get(fileKey);
    if(!fileData) {
      throw new Error("Arquivo não encontrado");
    }

    let fileBuffer: Uint8Array;
    if (Buffer.isBuffer(fileData)) {
      fileBuffer = new Uint8Array(fileData);
    } else if (typeof fileData === "object" && fileData !== null) {
      const bufferData = fileData as {}
    }
  } catch (error) {
    throw new Error("Erro ao extrair texto do PDF");
  }
}