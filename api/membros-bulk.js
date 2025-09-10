import { sql } from '@vercel/postgres';
import { randomUUID } from 'crypto';

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

        const sanitizeData = (data) => {
            const sanitized = {};
            for (const key in data) {
                const value = typeof data[key] === 'string' ? data[key].trim() : data[key];
                sanitized[key] = value === '' ? null : value;
            }
            if (!sanitized.casdastro) {
                sanitized.casdastro = randomUUID();
            }
            return sanitized;
        };

        const sanitizedMembros = membros.map(m => sanitizeData(m));

        // Deleta todos os registros existentes antes de importar
        await sql`DELETE FROM membros;`;

        for (const membro of sanitizedMembros) {
            await sql`
                INSERT INTO membros (
                    casdastro, Nm_Membro, Status, Tem_Filhos, Sexo, Membro, Batizado,
                    Celular, Data_Nasc, CPF, Naturalidade, Estado_Civil, Escolaridade,
                    Profissao, Nm_Conjuge, Endereco, Comp_Endereco, Bairro, Cidade, CEP,
                    Nm_Mae, Nm_Pai
                )
                VALUES (
                    ${membro.casdastro}, ${membro.Nm_Membro}, ${membro.Status}, ${membro.Tem_Filhos},
                    ${membro.Sexo}, ${membro.Membro}, ${membro.Batizado}, ${membro.Celular},
                    ${membro.Data_Nasc}, ${membro.CPF}, ${membro.Naturalidade}, ${membro.Estado_Civil},
                    ${membro.Escolaridade}, ${membro.Profissao}, ${membro.Nm_Conjuge}, ${membro.Endereco},
                    ${membro.Comp_Endereco}, ${membro.Bairro}, ${membro.Cidade}, ${membro.CEP},
                    ${membro.Nm_Mae}, ${membro.Nm_Pai}
                )
                ON CONFLICT (casdastro) DO NOTHING;
            `;
        }
        
        return res.status(200).json({ message: `${membros.length} registros importados com sucesso!` });

    } catch (error) {
        console.error('Erro na importação em massa:', error);
        return res.status(500).json({ error: 'Erro ao importar dados em massa.', details: error.message });
    }
}
