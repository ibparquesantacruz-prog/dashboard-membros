// api/membros/index.js
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM membros ORDER BY nm_membro`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const body = await readJson(req);

      const required = ['nm_membro','status','tem_filhos','sexo','tp_vinculo','batizado','celular','data_nasc','cpf'];
      const missing = required.filter(k => !body[k]);
      if (missing.length) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes', missingFields: missing });
      }

      try {
        const [row] = await sql`
          INSERT INTO membros (
            nm_membro,status,tem_filhos,sexo,tp_vinculo,batizado,celular,data_nasc,cpf,
            naturalidade,estado_civil,escolaridade,profissao,nm_conjuge,endereco,comp_endereco,
            bairro,cidade,cep,nm_mae,nm_pai
          ) VALUES (
            ${body.nm_membro},${body.status},${normalizeSN(body.tem_filhos)},${body.sexo},${body.tp_vinculo},
            ${normalizeSN(body.batizado)},${body.celular},${toISODate(body.data_nasc)},${body.cpf},
            ${body.naturalidade||null},${body.estado_civil||null},${body.escolaridade||null},
            ${body.profissao||null},${body.nm_conjuge||null},${body.endereco||null},${body.comp_endereco||null},
            ${body.bairro||null},${body.cidade||null},${body.cep||null},${body.nm_mae||null},${body.nm_pai||null}
          ) RETURNING *;
        `;
        return res.status(201).json(row);
      } catch (e) {
        const msg = String(e.message || e).toLowerCase();
        if (msg.includes('unique')) {
          return res.status(400).json({ error: 'Já existe um membro cadastrado com este CPF' });
        }
        console.error(e);
        return res.status(500).json({ error: 'Erro ao inserir' });
      }
    }

    res.setHeader('Allow',['GET','POST']);
    return res.status(405).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}

function normalizeSN(v) {
  if (v === undefined || v === null) return null;
  const val = v.toString().trim().toLowerCase();
  if (['s','sim','yes','y','true','1'].includes(val)) return 'S';
  if (['n','nao','não','no','false','0'].includes(val)) return 'N';
  return v.toString().toUpperCase();
}

function toISODate(d) {
  if (!d) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : d;
}

async function readJson(req) {
  return new Promise((resolve,reject)=>{
    let data=''; req.on('data',c=>data+=c);
    req.on('end',()=>{ try{resolve(JSON.parse(data||'{}'))}catch(e){reject(e)} });
    req.on('error',reject);
  });
}
