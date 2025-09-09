import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            const { rows } = await sql`SELECT * FROM membros;`;
            return res.status(200).json(rows);
        }

        const data = req.body;
        if (!data || !data.casdastro) {
            return res.status(400).json({ error: 'Dados inválidos ou incompletos.' });
        }
        
        // Nova validação para converter strings vazias em null
        const sanitizedData = {};
        for (const key in data) {
            sanitizedData[key] = data[key] === '' ? null : data[key];
        }

        if (req.method === 'POST') {
            await sql`
                INSERT INTO membros (casdastro, Nm_Membro, Status, Tem_Filhos, Sexo, Membro, Batizado, Celular, Data_Nasc, CPF, Naturalidade, Estado_Civil, Escolaridade, Profissao, Nm_Conjuge, Endereco, Comp_Endereco, Bairro, Cidade, CEP, Nm_Mae, Nm_Pai)
                VALUES (
                    ${sanitizedData.casdastro}, ${sanitizedData.Nm_Membro}, ${sanitizedData.Status}, ${sanitizedData.Tem_Filhos}, ${sanitizedData.Sexo}, ${sanitizedData.Membro}, ${sanitizedData.Batizado}, ${sanitizedData.Celular}, ${sanitizedData.Data_Nasc}, ${sanitizedData.CPF},
                    ${sanitizedData.Naturalidade}, ${sanitizedData.Estado_Civil}, ${sanitizedData.Escolaridade}, ${sanitizedData.Profissao}, ${sanitizedData.Nm_Conjuge}, ${sanitizedData.Endereco}, ${sanitizedData.Comp_Endereco},
                    ${sanitizedData.Bairro}, ${sanitizedData.Cidade}, ${sanitizedData.CEP}, ${sanitizedData.Nm_Mae}, ${sanitizedData.Nm_Pai}
                );
            `;
            return res.status(201).json({ message: 'Membro adicionado com sucesso!' });
        }

        if (req.method === 'PUT') {
            await sql`
                UPDATE membros
                SET
                    Nm_Membro = ${sanitizedData.Nm_Membro},
                    Status = ${sanitizedData.Status},
                    Tem_Filhos = ${sanitizedData.Tem_Filhos},
                    Sexo = ${sanitizedData.Sexo},
                    Membro = ${sanitizedData.Membro},
                    Batizado = ${sanitizedData.Batizado},
                    Celular = ${sanitizedData.Celular},
                    Data_Nasc = ${sanitizedData.Data_Nasc},
                    CPF = ${sanitizedData.CPF},
                    Naturalidade = ${sanitizedData.Naturalidade},
                    Estado_Civil = ${sanitizedData.Estado_Civil},
                    Escolaridade = ${sanitizedData.Escolaridade},
                    Profissao = ${sanitizedData.Profissao},
                    Nm_Conjuge = ${sanitizedData.Nm_Conjuge},
                    Endereco = ${sanitizedData.Endereco},
                    Comp_Endereco = ${sanitizedData.Comp_Endereco},
                    Bairro = ${sanitizedData.Bairro},
                    Cidade = ${sanitizedData.Cidade},
                    CEP = ${sanitizedData.CEP},
                    Nm_Mae = ${sanitizedData.Nm_Mae},
                    Nm_Pai = ${sanitizedData.Nm_Pai}
                WHERE casdastro = ${sanitizedData.casdastro};
            `;
            return res.status(200).json({ message: 'Membro atualizado com sucesso!' });
        }

        if (req.method === 'DELETE') {
            await sql`DELETE FROM membros WHERE casdastro = ${sanitizedData.casdastro};`;
            return res.status(200).json({ message: 'Membro excluído com sucesso!' });
        }

        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
}
