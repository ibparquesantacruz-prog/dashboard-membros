import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    // Definir os cabeçalhos para permitir CORS, se necessário
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Responde a pré-requisição OPTIONS (necessário para CORS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            const { rows } = await sql`SELECT * FROM membros;`;
            return res.status(200).json(rows);
        }

        const data = req.body;
        // Validação básica dos dados de entrada para evitar erros de SQL
        if (!data || !data.casdastro) {
            return res.status(400).json({ error: 'Dados inválidos ou incompletos.' });
        }

        if (req.method === 'POST') {
            await sql`
                INSERT INTO membros (casdastro, Nm_Membro, Status, Tem_Filhos, Sexo, Membro, Batizado, Celular, Data_Nasc, CPF, Naturalidade, Estado_Civil, Escolaridade, Profissao, Nm_Conjuge, Endereco, Comp_Endereco, Bairro, Cidade, CEP, Nm_Mae, Nm_Pai)
                VALUES (${data.casdastro}, ${data.Nm_Membro}, ${data.Status}, ${data.Tem_Filhos}, ${data.Sexo}, ${data.Membro}, ${data.Batizado}, ${data.Celular}, ${data.Data_Nasc}, ${data.CPF}, ${data.Naturalidade}, ${data.Estado_Civil}, ${data.Escolaridade}, ${data.Profissao}, ${data.Nm_Conjuge}, ${data.Endereco}, ${data.Comp_Endereco}, ${data.Bairro}, ${data.Cidade}, ${data.CEP}, ${data.Nm_Mae}, ${data.Nm_Pai});
            `;
            return res.status(201).json({ message: 'Membro adicionado com sucesso!' });
        }

        if (req.method === 'PUT') {
            await sql`
                UPDATE membros
                SET
                    Nm_Membro = ${data.Nm_Membro},
                    Status = ${data.Status},
                    Tem_Filhos = ${data.Tem_Filhos},
                    Sexo = ${data.Sexo},
                    Membro = ${data.Membro},
                    Batizado = ${data.Batizado},
                    Celular = ${data.Celular},
                    Data_Nasc = ${data.Data_Nasc},
                    CPF = ${data.CPF},
                    Naturalidade = ${data.Naturalidade},
                    Estado_Civil = ${data.Estado_Civil},
                    Escolaridade = ${data.Escolaridade},
                    Profissao = ${data.Profissao},
                    Nm_Conjuge = ${data.Nm_Conjuge},
                    Endereco = ${data.Endereco},
                    Comp_Endereco = ${data.Comp_Endereco},
                    Bairro = ${data.Bairro},
                    Cidade = ${data.Cidade},
                    CEP = ${data.CEP},
                    Nm_Mae = ${data.Nm_Mae},
                    Nm_Pai = ${data.Nm_Pai}
                WHERE casdastro = ${data.casdastro};
            `;
            return res.status(200).json({ message: 'Membro atualizado com sucesso!' });
        }

        if (req.method === 'DELETE') {
            await sql`DELETE FROM membros WHERE casdastro = ${data.casdastro};`;
            return res.status(200).json({ message: 'Membro excluído com sucesso!' });
        }

        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
}
