// api/membros/backup.js
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }
  try {
    const rows = await sql`SELECT * FROM membros ORDER BY nm_membro`;
    const headers = [
      'Nm_Membro','Status','Tem_Filhos','Sexo','Tp_Vinculo','Batizado','Celular','Data_Nasc','CPF',
      'Naturalidade','Estado_Civil','Escolaridade','Profissao','Nm_Conjuge','Endereco','Comp_Endereco',
      'Bairro','Cidade','CEP','Nm_Mae','Nm_Pai'
    ];
    const lines = [headers.join(';')];
    for (const r of rows) {
      const vals = [
        r.nm_membro, r.status, r.tem_filhos, r.sexo, r.tp_vinculo, r.batizado, r.celular,
        toBRDate(r.data_nasc), r.cpf, r.naturalidade, r.estado_civil, r.escolaridade, r.profissao,
        r.nm_conjuge, r.endereco, r.comp_endereco, r.bairro, r.cidade, r.cep, r.nm_mae, r.nm_pai
      ].map(v => (v == null ? '' : String(v).replace(/;/g, ',')));
      lines.push(vals.join(';'));
    }
    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=membros_backup.csv');
    return res.status(200).send(csv);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao gerar backup' });
  }
}

function toBRDate(d){
  if (!d) return '';
  const dt = new Date(d);
  const dd = String(dt.getUTCDate()).padStart(2,'0');
  const mm = String(dt.getUTCMonth()+1).padStart(2,'0');
  const yyyy = dt.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
