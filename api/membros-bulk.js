const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    try {
        const membros = req.body;
        if (!Array.isArray(membros) || membros.length === 0) {
            return res.status(400).json({ error: 'Nenhum membro enviado para importação.' });
        }
        
        const sanitizeData = (data) => {
            const sanitized = {};
            for (const key in data) {
                const value = typeof data[key] === 'string' ? data[key].trim() : data[key];
                sanitized[key] = value === '' ? null : value;
            }
            return sanitized;
        };
        const sanitizedMembros = membros.map(membro => sanitizeData(membro));
        
        for (const membro of sanitizedMembros) {
            await sql`
                INSERT INTO membros (casdastro, Nm_Membro, Status, Tem_Filhos, Sexo, Membro, Batizado, Celular, Data_Nasc, CPF, Naturalidade, Estado_Civil, Escolaridade, Profissao, Nm_Conjuge, Endereco, Comp_Endereco, Bairro, Cidade, CEP, Nm_Mae, Nm_Pai)
                VALUES (
                    ${membro.casdastro}, ${membro.Nm_Membro}, ${membro.Status}, ${membro.Tem_Filhos}, ${membro.Sexo}, ${membro.Membro}, ${membro.Batizado}, ${membro.Celular}, ${membro.Data_Nasc}, ${membro.CPF},
                    ${membro.Naturalidade}, ${membro.Estado_Civil}, ${membro.Escolaridade}, ${membro.Profissao}, ${membro.Nm_Conjuge}, ${membro.Endereco}, ${membro.Comp_Endereco},
                    ${membro.Bairro}, ${membro.Cidade}, ${membro.CEP}, ${membro.Nm_Mae}, ${membro.Nm_Pai}
                )
                ON CONFLICT (casdastro) DO UPDATE SET
                    Nm_Membro = EXCLUDED.Nm_Membro,
                    Status = EXCLUDED.Status,
                    Tem_Filhos = EXCLUDED.Tem_Filhos,
                    Sexo = EXCLUDED.Sexo,
                    Membro = EXCLUDED.Membro,
                    Batizado = EXCLUDED.Batizado,
                    Celular = EXCLUDED.Celular,
                    Data_Nasc = EXCLUDED.Data_Nasc,
                    CPF = EXCLUDED.CPF,
                    Naturalidade = EXCLUDED.Naturalidade,
                    Estado_Civil = EXCLUDED.Estado_Civil,
                    Escolaridade = EXCLUDED.Escolaridade,
                    Profissao = EXCLUDED.Profissao,
                    Nm_Conjuge = EXCLUDED.Nm_Conjuge,
                    Endereco = EXCLUDED.Endereco,
                    Comp_Endereco = EXCLUDED.Comp_Endereco,
                    Bairro = EXCLUDED.Bairro,
                    Cidade = EXCLUDED.Cidade,
                    CEP = EXCLUDED.CEP,
                    Nm_Mae = EXCLUDED.Nm_Mae,
                    Nm_Pai = EXCLUDED.Nm_Pai;
            `;
        }
        
        return res.status(200).json({ message: `${membros.length} registros importados com sucesso!` });
    } catch (error) {
        console.error('Erro na importação em massa:', error);
        return res.status(500).json({ error: 'Erro ao importar dados em massa.', details: error.message });
    }
}
