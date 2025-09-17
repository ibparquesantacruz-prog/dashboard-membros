// api/membros/import.js
import { neon } from '@neondatabase/serverless';
import Busboy from 'busboy';
import { parse as parseCsv } from 'csv-parse/sync';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  try {
    const fileBuffer = await readMultipartFile(req, 'csvFile');
    if (!fileBuffer) return res.status(400).json({ error: 'Arquivo não enviado (campo csvFile)' });

    const text = fileBuffer.toString('utf-8');
    const records = parseCsv(text, { columns: true, skip_empty_lines: true, delimiter: ';', trim: true });

    const required = ['Nm_Membro','Status','Tem_Filhos','Sexo','Tp_Vinculo','Batizado','Celular','Data_Nasc','CPF'];
    const errors = [];
    let ok = 0;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];

      // Se não houver Tp_Vinculo mas houver Membro (Sim/Não), converte.
      if ((!row.Tp_Vinculo || String(row.Tp_Vinculo).trim() === '') && row.Membro !== undefined) {
        const isMembro = normalizeSN(row.Membro) === 'S';
        row.Tp_Vinculo = isMembro ? 'Membro' : 'Congregado';
      }

      const missing = required.filter(k => !(row[k] && String(row[k]).trim().length));
      if (missing.length) {
        errors.push({ line: i+2, error: `Campos obrigatórios ausentes: ${missing.join(', ')}` });
        continue;
      }

      try {
        await sql`
          INSERT INTO membros (
            nm_membro, status, tem_filhos, sexo, tp_vinculo, batizado, celular, data_nasc, cpf,
            naturalidade, estado_civil, escolaridade, profissao, nm_conjuge, endereco, comp_endereco,
            bairro, cidade, cep, nm_mae, nm_pai
          )
          VALUES (
            ${row.Nm_Membro}, ${row.Status}, ${normalizeSN(row.Tem_Filhos)}, ${row.Sexo}, ${row.Tp_Vinculo}, ${normalizeSN(row.Batizado)},
            ${row.Celular}, ${toISODate(row.Data_Nasc)}, ${row.CPF},
            ${nullable(row.Naturalidade)}, ${nullable(row.Estado_Civil)}, ${nullable(row.Escolaridade)},
            ${nullable(row.Profissao)}, ${nullable(row.Nm_Conjuge)}, ${nullable(row.Endereco)},
            ${nullable(row.Comp_Endereco)}, ${nullable(row.Bairro)}, ${nullable(row.Cidade)},
            ${nullable(row.CEP)}, ${nullable(row.Nm_Mae)}, ${nullable(row.Nm_Pai)}
          )
          ON CONFLICT (cpf) DO UPDATE SET
            nm_membro=EXCLUDED.nm_membro,
            status=EXCLUDED.status,
            tem_filhos=EXCLUDED.tem_filhos,
            sexo=EXCLUDED.sexo,
            tp_vinculo=EXCLUDED.tp_vinculo,
            batizado=EXCLUDED.batizado,
            celular=EXCLUDED.celular,
            data_nasc=EXCLUDED.data_nasc,
            naturalidade=EXCLUDED.naturalidade,
            estado_civil=EXCLUDED.estado_civil,
            escolaridade=EXCLUDED.escolaridade,
            profissao=EXCLUDED.profissao,
            nm_conjuge=EXCLUDED.nm_conjuge,
            endereco=EXCLUDED.endereco,
            comp_endereco=EXCLUDED.comp_endereco,
            bairro=EXCLUDED.bairro,
            cidade=EXCLUDED.cidade,
            cep=EXCLUDED.cep,
            nm_mae=EXCLUDED.nm_mae,
            nm_pai=EXCLUDED.nm_pai
        `;
        ok += 1;
      } catch (e) {
        errors.push({ line: i+2, error: String(e.message || e) });
      }
    }

    return res.status(200).json({ insertedOrUpdated: ok, errors });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao importar CSV' });
  }
}

// Helpers
function nullable(v){ return v ?? null; }

function normalizeSN(v) {
  if (v === undefined || v === null) return null;
  const val = v.toString().trim().toLowerCase();
  if (['s','sim','yes','y','true','1'].includes(val)) return 'S';
  if (['n','nao','não','no','false','0'].includes(val)) return 'N';
  return v.toString().toUpperCase();
}

function toISODate(brDate) {
  // aceita "dd/mm/aaaa" ou "aaaa-mm-dd"
  if (!brDate) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(brDate)) return brDate;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(brDate));
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return brDate;
}

async function readMultipartFile(req, fieldName) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    let fileData = Buffer.alloc(0);
    let found = false;

    busboy.on('file', (name, file) => {
      if (name === fieldName) found = true;
      file.on('data', (data) => { fileData = Buffer.concat([fileData, data]); });
    });

    busboy.on('finish', () => resolve(found ? fileData : null));
    busboy.on('error', reject);
    req.pipe(busboy);
  });
}
