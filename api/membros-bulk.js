import { db } from '@vercel/postgres';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const client = await db.connect();

    try {
        const membros = req.body;

        if (!Array.isArray(membros) || membros.length === 0) {
            return res.status(400).json({ error: 'Nenhum membro enviado para importação.' });
        }

        // Deletar todos os registros existentes antes de importar
        await client.sql`TRUNCATE TABLE membros;`;

        // Preparar os dados para a inserção em massa de forma segura
        const columns = [
            'casdastro', 'Nm_Membro', 'Status', 'Tem_Filhos', 'Sexo', 'Membro', 'Batizado', 'Celular', 'Data_Nasc', 'CPF',
            'Naturalidade', 'Estado_Civil', 'Escolaridade', 'Profissao', 'Nm_Conjuge', 'Endereco', 'Comp_Endereco',
            'Bairro', 'Cidade', 'CEP', 'Nm_Mae', 'Nm_Pai'
        ];
        
        // Mapeia os objetos de membros para um array de arrays de valores
        const values = membros.map(membro => {
            return columns.map(col => membro[col] || null);
        });

        // Executa a inserção em massa de forma segura
        await client.sql.insert('membros').columns(columns).values(values);
        
        return res.status(200).json({ message: `${membros.length} registros importados com sucesso!` });
    } catch (error) {
        console.error('Erro na importação em massa:', error);
        return res.status(500).json({ error: 'Erro ao importar dados em massa.', details: error.message });
    } finally {
        if (client) {
            client.release();
        }
    }
}
