import { db } from '@vercel/postgres';

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

        // Deletar todos os registros existentes antes de importar
        await db`TRUNCATE TABLE membros;`;

        // Preparar os valores para a inserção em massa
        const insertValues = membros.map(membro => {
            return `('${membro.casdastro}', '${membro.Nm_Membro}', '${membro.Status}', '${membro.Tem_Filhos}', '${membro.Sexo}', '${membro.Membro}', '${membro.Batizado}', '${membro.Celular}', '${membro.Data_Nasc}', '${membro.CPF}', '${membro.Naturalidade}', '${membro.Estado_Civil}', '${membro.Escolaridade}', '${membro.Profissao}', '${membro.Nm_Conjuge}', '${membro.Endereco}', '${membro.Comp_Endereco}', '${membro.Bairro}', '${membro.Cidade}', '${membro.CEP}', '${membro.Nm_Mae}', '${membro.Nm_Pai}')`;
        }).join(', ');

        const query = `
            INSERT INTO membros (
                casdastro, Nm_Membro, Status, Tem_Filhos, Sexo, Membro, Batizado, Celular, Data_Nasc, CPF,
                Naturalidade, Estado_Civil, Escolaridade, Profissao, Nm_Conjuge, Endereco, Comp_Endereco,
                Bairro, Cidade, CEP, Nm_Mae, Nm_Pai
            ) VALUES ${insertValues};
        `;

        await db.query(query);

        return res.status(200).json({ message: `${membros.length} registros importados com sucesso!` });
    } catch (error) {
        console.error('Erro na importação em massa:', error);
        return res.status(500).json({ error: 'Erro ao importar dados em massa.' });
    }
}
