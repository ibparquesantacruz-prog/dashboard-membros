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
        
        // Usando uma transação para garantir que todas as operações sejam bem-sucedidas ou nenhuma delas
        const client = await sql.connect();

        try {
            await client.query('BEGIN');

            for (const membro of membros) {
                // Converte strings vazias em null para consistência no banco de dados
                const sanitizedMembro = Object.fromEntries(
                    Object.entries(membro).map(([key, value]) => [key, value === '' ? null : value])
                );

                const {
                    casdastro, Nm_Membro, Status, Tem_Filhos, Sexo, Membro, Batizado, Celular, Data_Nasc, CPF,
                    Naturalidade, Estado_Civil, Escolaridade, Profissao, Nm_Conjuge, Endereco, Comp_Endereco,
                    Bairro, Cidade, CEP, Nm_Mae, Nm_Pai
                } = sanitizedMembro;

                await client.query(
                    `
                    INSERT INTO membros (
                        casdastro, Nm_Membro, Status, Tem_Filhos, Sexo, Membro, Batizado, Celular, Data_Nasc, CPF,
                        Naturalidade, Estado_Civil, Escolaridade, Profissao, Nm_Conjuge, Endereco, Comp_Endereco,
                        Bairro, Cidade, CEP, Nm_Mae, Nm_Pai
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
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
                    `,
                    [
                        casdastro, Nm_Membro, Status, Tem_Filhos, Sexo, Membro, Batizado, Celular, Data_Nasc, CPF,
                        Naturalidade, Estado_Civil, Escolaridade, Profissao, Nm_Conjuge, Endereco, Comp_Endereco,
                        Bairro, Cidade, CEP, Nm_Mae, Nm_Pai
                    ]
                );
            }
            
            await client.query('COMMIT');
            client.release();
            return res.status(200).json({ message: `${membros.length} registros importados com sucesso!` });

        } catch (error) {
            await client.query('ROLLBACK');
            client.release();
            throw error; // Lança o erro para o catch externo
        }

    } catch (error) {
        console.error('Erro na importação em massa:', error);
        return res.status(500).json({ error: 'Erro ao importar dados em massa.', details: error.message });
    }
}
