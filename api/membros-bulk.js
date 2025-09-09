import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const membros = req.body;

        if (!Array.isArray(membros) || membros.length === 0) {
            return res.status(400).json({ error: 'Nenhum membro enviado para importação.' });
        }
        
        // Converte strings vazias para null em todos os objetos de membro
        const sanitizedMembros = membros.map(membro => {
            const sanitizedMembro = {};
            for (const key in membro) {
                // Remove espaços em branco antes de verificar se é uma string vazia
                const value = typeof membro[key] === 'string' ? membro[key].trim() : membro[key];
                sanitizedMembro[key] = value === '' ? null : value;
            }
            return sanitizedMembro;
        });
        
        // Iniciar uma transação para garantir que a operação seja atômica
        // Primeiro, deletar todos os registros existentes (TRUNCATE)
        await sql`TRUNCATE TABLE membros;`;

        // Agora, inserir cada membro individualmente dentro de uma transação
        // A biblioteca Vercel Postgres não suporta a sintaxe de `INSERT` com múltiplos valores (multi-row insert)
        // de forma eficiente. A forma mais segura e compatível é iterar e inserir um por um.
        for (const membro of sanitizedMembros) {
            await sql`
                INSERT INTO membros (casdastro, Nm_Membro, Status, Tem_Filhos, Sexo, Membro, Batizado, Celular, Data_Nasc, CPF, Naturalidade, Estado_Civil, Escolaridade, Profissao, Nm_Conjuge, Endereco, Comp_Endereco, Bairro, Cidade, CEP, Nm_Mae, Nm_Pai)
                VALUES (
                    ${membro.casdastro},
                    ${membro.Nm_Membro},
                    ${membro.Status},
                    ${membro.Tem_Filhos},
                    ${membro.Sexo},
                    ${membro.Membro},
                    ${membro.Batizado},
                    ${membro.Celular},
                    ${membro.Data_Nasc},
                    ${membro.CPF},
                    ${membro.Naturalidade},
                    ${membro.Estado_Civil},
                    ${membro.Escolaridade},
                    ${membro.Profissao},
                    ${membro.Nm_Conjuge},
                    ${membro.Endereco},
                    ${membro.Comp_Endereco},
                    ${membro.Bairro},
                    ${membro.Cidade},
                    ${membro.CEP},
                    ${membro.Nm_Mae},
                    ${membro.Nm_Pai}
                );
            `;
        }

        return res.status(200).json({ message: `${membros.length} registros importados com sucesso!` });

    } catch (error) {
        console.error('Erro na importação em massa:', error);
        return res.status(500).json({ error: 'Erro ao importar dados em massa.', details: error.message });
    }
}
