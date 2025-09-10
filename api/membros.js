const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
    // Apenas para permitir o teste de qualquer origem
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Apenas o método PUT (editar) será considerado para este teste
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Método não permitido para este teste.' });
    }

    try {
        const membro = req.body;

        // --- LINHA DE DEBUG IMPORTANTE ---
        // Vamos imprimir nos logs da Vercel os dados que a API está a receber.
        console.log("Dados recebidos na API para atualização:", membro);

        // Verifica se os dados mínimos para o teste existem
        if (!membro || !membro.casdastro || !membro.Nm_Membro) {
            console.log("Dados recebidos estão incompletos.");
            return res.status(400).json({ error: 'Dados incompletos para o teste: casdastro e Nm_Membro são necessários.' });
        }

        // --- QUERY DE TESTE SIMPLIFICADA ---
        // Tenta atualizar APENAS o nome do membro.
        await sql`
            UPDATE membros
            SET Nm_Membro = ${membro.Nm_Membro}
            WHERE casdastro = ${membro.casdastro};
        `;

        console.log(`Tentativa de atualizar o membro ${membro.casdastro} para o nome ${membro.Nm_Membro} concluída.`);
        
        // Retorna todos os membros para a aplicação se atualizar
        const { rows } = await sql`SELECT * FROM membros ORDER BY Nm_Membro;`;
        return res.status(200).json(rows);

    } catch (error) {
        console.error('API Error no teste de escrita:', error);
        return res.status(500).json({ error: 'Erro interno do servidor no teste de escrita', details: error.message });
    }
}
