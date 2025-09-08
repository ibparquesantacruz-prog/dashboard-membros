import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const { rows } = await sql`SELECT * FROM membros;`;
            return res.status(200).json(rows);
        }

        if (req.method === 'POST') {
            const { casdastro, Nm_Membro, Status, Tem_Filhos, Sexo, Membro, Batizado, Celular, Data_Nasc, CPF, Naturalidade, Estado_Civil, Escolaridade, Profissao, Nm_Conjuge, Endereco, Comp_Endereco, Bairro, Cidade, CEP, Nm_Mae, Nm_Pai } = req.body;
            await sql`
                INSERT INTO membros (casdastro, Nm_Membro, Status, Tem_Filhos, Sexo, Membro, Batizado, Celular, Data_Nasc, CPF, Naturalidade, Estado_Civil, Escolaridade, Profissao, Nm_Conjuge, Endereco, Comp_Endereco, Bairro, Cidade, CEP, Nm_Mae, Nm_Pai)
                VALUES (${casdastro}, ${Nm_Membro}, ${Status}, ${Tem_Filhos}, ${Sexo}, ${Membro}, ${Batizado}, ${Celular}, ${Data_Nasc}, ${CPF}, ${Naturalidade}, ${Estado_Civil}, ${Escolaridade}, ${Profissao}, ${Nm_Conjuge}, ${Endereco}, ${Comp_Endereco}, ${Bairro}, ${Cidade}, ${CEP}, ${Nm_Mae}, ${Nm_Pai});
            `;
            return res.status(201).json({ message: 'Membro adicionado com sucesso!' });
        }

        if (req.method === 'PUT') {
            const { casdastro, Nm_Membro, Status, Tem_Filhos, Sexo, Membro, Batizado, Celular, Data_Nasc, CPF, Naturalidade, Estado_Civil, Escolaridade, Profissao, Nm_Conjuge, Endereco, Comp_Endereco, Bairro, Cidade, CEP, Nm_Mae, Nm_Pai } = req.body;
            await sql`
                UPDATE membros
                SET
                    Nm_Membro = ${Nm_Membro},
                    Status = ${Status},
                    Tem_Filhos = ${Tem_Filhos},
                    Sexo = ${Sexo},
                    Membro = ${Membro},
                    Batizado = ${Batizado},
                    Celular = ${Celular},
                    Data_Nasc = ${Data_Nasc},
                    CPF = ${CPF},
                    Naturalidade = ${Naturalidade},
                    Estado_Civil = ${Estado_Civil},
                    Escolaridade = ${Escolaridade},
                    Profissao = ${Profissao},
                    Nm_Conjuge = ${Nm_Conjuge},
                    Endereco = ${Endereco},
                    Comp_Endereco = ${Comp_Endereco},
                    Bairro = ${Bairro},
                    Cidade = ${Cidade},
                    CEP = ${CEP},
                    Nm_Mae = ${Nm_Mae},
                    Nm_Pai = ${Nm_Pai}
                WHERE casdastro = ${casdastro};
            `;
            return res.status(200).json({ message: 'Membro atualizado com sucesso!' });
        }

        if (req.method === 'DELETE') {
            const { casdastro } = req.body;
            await sql`DELETE FROM membros WHERE casdastro = ${casdastro};`;
            return res.status(200).json({ message: 'Membro excluído com sucesso!' });
        }

        // Se o método não for suportado, retorna 405
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
