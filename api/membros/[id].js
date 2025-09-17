// api/membros/[id].js
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req,res){
  const id = Number(req.query.id);
  if(!Number.isInteger(id)) return res.status(400).json({error:'id inválido'});

  try {
    if(req.method==='GET'){
      const rows = await sql`SELECT * FROM membros WHERE id=${id}`;
      return rows.length ? res.status(200).json(rows[0]) : res.status(404).json({error:'Membro não encontrado'});
    }

    if(req.method==='PUT'){
      const body = await readJson(req);
      try{
        const [row] = await sql`
          UPDATE membros SET
            nm_membro=${body.nm_membro}, status=${body.status}, tem_filhos=${normalizeSN(body.tem_filhos)},
            sexo=${body.sexo}, tp_vinculo=${body.tp_vinculo}, batizado=${normalizeSN(body.batizado)},
            celular=${body.celular}, data_nasc=${toISODate(body.data_nasc)}, cpf=${body.cpf},
            naturalidade=${body.naturalidade||null}, estado_civil=${body.estado_civil||null},
            escolaridade=${body.escolaridade||null}, profissao=${body.profissao||null},
            nm_conjuge=${body.nm_conjuge||null}, endereco=${body.endereco||null},
            comp_endereco=${body.comp_endereco||null}, bairro=${body.bairro||null}, cidade=${body.cidade||null},
            cep=${body.cep||null}, nm_mae=${body.nm_mae||null}, nm_pai=${body.nm_pai||null}
          WHERE id=${id} RETURNING *;
        `;
        return row ? res.status(200).json(row) : res.status(404).json({error:'Membro não encontrado'});
      } catch(e){
        const msg = String(e.message || e).toLowerCase();
        if(msg.includes('unique')) return res.status(400).json({error:'Já existe outro membro cadastrado com este CPF'});
        console.error(e);
        return res.status(500).json({error:'Erro ao atualizar'});
      }
    }

    if(req.method==='DELETE'){
      const result = await sql`DELETE FROM membros WHERE id=${id} RETURNING id`;
      return result.length ? res.status(204).end() : res.status(404).json({error:'Membro não encontrado'});
    }

    res.setHeader('Allow',['GET','PUT','DELETE']); 
    return res.status(405).end();
  } catch(err){
    console.error(err);
    return res.status(500).json({error:'Erro interno'});
  }
}

function normalizeSN(v){ 
  if (v === undefined || v === null) return null;
  const val = v.toString().trim().toLowerCase();
  if(['s','sim','yes','y','true','1'].includes(val)) return 'S';
  if(['n','nao','não','no','false','0'].includes(val)) return 'N';
  return v.toString().toUpperCase();
}
function toISODate(d){ 
  if(!d) return null; 
  if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return d; 
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d)); 
  return m?`${m[3]}-${m[2]}-${m[1]}`:d; 
}
async function readJson(req){ 
  return new Promise((resolve,reject)=>{ 
    let data=''; req.on('data',c=>data+=c); 
    req.on('end',()=>{ try{resolve(JSON.parse(data||'{}'))}catch(e){reject(e)} }); 
    req.on('error',reject); 
  }); 
}
