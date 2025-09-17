// /script.js — Front unificado (corrigido)

// ===================== Config =====================
const API_BASE_URL = ''; // mesma origem (Vercel)

// ===================== Estado =====================
let members = [];
let currentPage = 1;
const membersPerPage = 10;
let currentMemberId = null;
let currentReportType = '';

// ===================== Mapeamentos & Normalizações =====================
function snToSimNao(v){ return v==='S'?'Sim':(v==='N'?'Não':(v??'')); }
function simNaoToSN(v){ 
  if(v === undefined || v === null) return null; 
  v=String(v).trim().toLowerCase(); 
  if(['s','sim','yes','y','true','1'].includes(v)) return 'S'; 
  if(['n','nao','não','no','false','0'].includes(v)) return 'N'; 
  return String(v).toUpperCase(); 
}
function toISODate(d){ 
  if(!d) return null; 
  if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return d; 
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d)); 
  return m?`${m[3]}-${m[2]}-${m[1]}`:d; 
}
function toInputDate(d) {
  if (!d) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return '';
}
function mapFromApi(r){
  return {
    Id: r.id,
    Nm_Membro: r.nm_membro,
    Status: r.status,
    Tem_Filhos: snToSimNao(r.tem_filhos),
    Sexo: r.sexo,
    Tp_Vinculo: r.tp_vinculo,
    Batizado: snToSimNao(r.batizado),
    Celular: r.celular,
    Data_Nasc: r.data_nasc,
    CPF: r.cpf,
    Naturalidade: r.naturalidade,
    Estado_Civil: r.estado_civil,
    Escolaridade: r.escolaridade,
    Profissao: r.profissao,
    Nm_Conjuge: r.nm_conjuge,
    Endereco: r.endereco,
    Comp_Endereco: r.comp_endereco,
    Bairro: r.bairro,
    Cidade: r.cidade,
    CEP: r.cep,
    Nm_Mae: r.nm_mae,
    Nm_Pai: r.nm_pai
  };
}
function mapToApi(m){
  return {
    nm_membro: m.Nm_Membro,
    status: m.Status,
    tem_filhos: simNaoToSN(m.Tem_Filhos),
    sexo: m.Sexo,
    tp_vinculo: m.Tp_Vinculo,
    batizado: simNaoToSN(m.Batizado),
    celular: m.Celular,
    data_nasc: toISODate(m.Data_Nasc),
    cpf: m.CPF,
    naturalidade: m.Naturalidade || null,
    estado_civil: m.Estado_Civil || null,
    escolaridade: m.Escolaridade || null,
    profissao: m.Profissao || null,
    nm_conjuge: m.Nm_Conjuge || null,
    endereco: m.Endereco || null,
    comp_endereco: m.Comp_Endereco || null,
    bairro: m.Bairro || null,
    cidade: m.Cidade || null,
    cep: m.CEP || null,
    nm_mae: m.Nm_Mae || null,
    nm_pai: m.Nm_Pai || null
  };
}

// ===================== Init =====================
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initCharts();
  loadMembers();
});
// ===================== Eventos =====================
function setupEventListeners() {
  // Navegação por data-section (sidebar)
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      showSection(this.getAttribute('data-section'));
    });
  });

  // Busca e filtros
  const si = document.getElementById('search-input'); if (si) si.addEventListener('input', filterMembers);
  const sf = document.getElementById('status-filter'); if (sf) sf.addEventListener('change', filterMembers);
  const gf = document.getElementById('gender-filter'); if (gf) gf.addEventListener('change', filterMembers);
  const vf = document.getElementById('vinculo-filter'); if (vf) vf.addEventListener('change', filterMembers);

  // Botão novo membro
  const addBtn = document.getElementById('add-member-btn'); if (addBtn) addBtn.addEventListener('click', () => openMemberModal());

  // Form salvar
  const form = document.getElementById('member-form');
  if (form) form.addEventListener('submit', (e) => { e.preventDefault(); saveMember(); });

  // Fechar modais
  const cancelBtn = document.getElementById('cancel-btn'); if (cancelBtn) cancelBtn.addEventListener('click', closeMemberModal);
  document.querySelectorAll('.close').forEach(btn => btn.addEventListener('click', () => { closeMemberModal(); closeDeleteModal(); }));

  // Delete modal
  const cancelDel = document.getElementById('cancel-delete-btn'); if (cancelDel) cancelDel.addEventListener('click', closeDeleteModal);
  const confirmDel = document.getElementById('confirm-delete-btn'); if (confirmDel) confirmDel.addEventListener('click', deleteMember);

  // Relatórios
  document.querySelectorAll('.report-option').forEach(opt => {
    opt.addEventListener('click', () => generateReport(opt.getAttribute('data-report')));
  });

  // Import e Backup
  const importBtn = document.getElementById('import-btn'); if (importBtn) importBtn.addEventListener('click', importCSV);
  const backupBtn = document.getElementById('download-backup-btn'); if (backupBtn) backupBtn.addEventListener('click', downloadBackup);
}

// ===================== Carregamento =====================
async function loadMembers() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/membros`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.json();
    members = raw.map(mapFromApi);
  } catch (error) {
    console.error('Erro ao carregar membros:', error);
    members = [];
  }
  updateDashboard();
  renderMembersTable();
}

// ===================== Dashboard =====================
function updateDashboard() {
  setText('total-members', members.length);
  setText('active-members', members.filter(m => m.Status === 'Ativo').length);
  setText('baptized-members', members.filter(m => m.Batizado === 'Sim').length);

  const currentMonth = new Date().getMonth();
  const bdays = members.filter(m => m.Data_Nasc && new Date(m.Data_Nasc).getMonth() === currentMonth);
  setText('birthday-members', bdays.length);

  updateCharts();
  renderBirthdayTable();
}

function setText(id, value){ const el = document.getElementById(id); if (el) el.textContent = value; }

// ===================== Gráficos =====================
function initCharts() {
  window.genderChart = new Chart(document.getElementById('genderChart'), {
    type: 'pie',
    data: { labels: ['Masculino','Feminino'], datasets: [{ data: [0,0] }] }
  });

  window.statusChart = new Chart(document.getElementById('statusChart'), {
    type: 'bar',
    data: { labels: ['Ativo','Inativo'], datasets: [{ label: 'Quantidade', data: [0,0] }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

function updateCharts() {
  const male = members.filter(m => m.Sexo === 'Masculino').length;
  const female = members.filter(m => m.Sexo === 'Feminino').length;
  genderChart.data.datasets[0].data = [male,female];
  genderChart.update();

  const active = members.filter(m => m.Status === 'Ativo').length;
  const inactive = members.filter(m => m.Status === 'Inativo').length;
  statusChart.data.datasets[0].data = [active,inactive];
  statusChart.update();
}

// ===================== Aniversariantes =====================
function renderBirthdayTable() {
  const tbody = document.getElementById('birthday-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const currentMonth = new Date().getMonth();
  const list = members
    .filter(m => m.Data_Nasc && new Date(m.Data_Nasc).getMonth() === currentMonth)
    .sort((a,b) => new Date(a.Data_Nasc).getDate() - new Date(b.Data_Nasc).getDate());

  list.forEach(m => {
    const birth = new Date(m.Data_Nasc);
    const age = calculateAge(birth);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${m.Nm_Membro}</td><td>${formatDate(m.Data_Nasc)}</td><td>${age} anos</td>`;
    tbody.appendChild(tr);
  });
}
function calculateAge(birth){ 
  const today = new Date(); 
  let a = today.getFullYear() - birth.getFullYear(); 
  const adj = (today.getMonth()<birth.getMonth()) || (today.getMonth()===birth.getMonth() && today.getDate()<birth.getDate()); 
  return a - (adj?1:0); 
}

// ===================== Relatórios =====================
function generateReport(type) {
  currentReportType = type;
  const container = document.getElementById('report-container');
  if (!container) return;

  let reportData = [];
  let title = '';

  switch (type) {
    case 'nominal':
      title = 'Relatório Nominal';
      reportData = [...members].sort((a,b)=>a.Nm_Membro.localeCompare(b.Nm_Membro));
      break;
    case 'sexo':
      title = 'Relatório por Sexo';
      reportData = [
        {Categoria: 'Masculino', Quantidade: members.filter(m=>m.Sexo==='Masculino').length},
        {Categoria: 'Feminino', Quantidade: members.filter(m=>m.Sexo==='Feminino').length}
      ];
      break;
    case 'status':
      title = 'Relatório por Status';
      reportData = [
        {Categoria: 'Ativo', Quantidade: members.filter(m=>m.Status==='Ativo').length},
        {Categoria: 'Inativo', Quantidade: members.filter(m=>m.Status==='Inativo').length}
      ];
      break;
    case 'pais':
      title = 'Relatório Nominal de Pais';
      reportData = members.filter(m => m.Sexo==='Masculino' && m.Tem_Filhos==='Sim');
      break;
    case 'maes':
      title = 'Relatório Nominal de Mães';
      reportData = members.filter(m => m.Sexo==='Feminino' && m.Tem_Filhos==='Sim');
      break;
    case 'membros':
      title = 'Relatório de Membros';
      reportData = members.filter(m => m.Tp_Vinculo==='Membro');
      break;
    case 'congregados':
      title = 'Relatório de Congregados';
      reportData = members.filter(m => m.Tp_Vinculo==='Congregado');
      break;
    case 'aniversariantes':
      title = 'Aniversariantes do Mês';
      const mm = new Date().getMonth();
      reportData = members.filter(m => m.Data_Nasc && new Date(m.Data_Nasc).getMonth()===mm)
                          .sort((a,b)=>new Date(a.Data_Nasc).getDate()-new Date(b.Data_Nasc).getDate());
      break;
    default:
      title = 'Relatório'; reportData = [];
  }

  container.innerHTML = `<h3>${title}</h3>` + generateReportTable(reportData);
  const dl = document.getElementById('download-report-btn');
  if (dl) dl.addEventListener('click', downloadReport);
}

function generateReportTable(data) {
  if (!data || data.length===0) return `<p>Nenhum dado para exibir.</p>`;

  const headers = Object.keys(data[0]);
  let html = '<div class="table-container"><table class="report-table"><thead><tr>'
    + headers.map(h=>`<th>${h}</th>`).join('')
    + '</tr></thead><tbody>';

  data.forEach(item => {
    html += '<tr>' + headers.map(k => `<td>${item[k] ?? '-'}</td>`).join('') + '</tr>';
  });

  html += '</tbody></table></div>';
  html += `<button class="btn-primary" id="download-report-btn">Baixar Relatório (CSV)</button>`;
  return html;
}

function downloadReport() {
  const table = document.querySelector('.report-table');
  if (!table) return;

  let csv = '';
  const rows = table.querySelectorAll('tr');
  rows.forEach(row => {
    const cols = row.querySelectorAll('th,td');
    const rowData = [];
    cols.forEach(col => rowData.push(String(col.textContent).replace(/;/g, ',')));
    csv += rowData.join(';') + '\n';
  });

  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio_${currentReportType || 'dados'}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// ===================== Import & Backup =====================
async function importCSV() {
  const input = document.getElementById('csv-file');
  if (!input || !input.files.length) { alert('Selecione um arquivo CSV.'); return; }
  const formData = new FormData(); formData.append('csvFile', input.files[0]);

  try {
    const resp = await fetch(`${API_BASE_URL}/api/membros/import`, { method: 'POST', body: formData });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const result = await resp.json();
    alert(`Importação: ${result.insertedOrUpdated} registros válidos, ${result.errors.length} erros.`);
    if (result.errors?.length) console.warn(result.errors);
    input.value = '';
    await loadMembers();
  } catch (e) {
    console.error('Erro ao importar CSV:', e);
    alert('Erro ao importar CSV. Verifique o formato do arquivo.');
  }
}

async function downloadBackup() {
  try {
    const resp = await fetch(`${API_BASE_URL}/api/membros/backup`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'membros_backup.csv';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Erro ao gerar backup:', e);
    alert('Erro ao gerar backup.');
  }
}

// ===================== Util =====================
function getPaginatedMembers(){ 
  const start=(currentPage-1)*membersPerPage; 
  const end=start+membersPerPage; 
  return members.slice(start,end); 
}
function formatDate(dateStr){ 
  if(!dateStr) return '-'; 
  const d=new Date(dateStr); 
  if (isNaN(d.getTime())) return '-'; 
  const dd=String(d.getUTCDate()).padStart(2,'0'); 
  const mm=String(d.getUTCMonth()+1).padStart(2,'0'); 
  const yy=d.getUTCFullYear(); 
  return `${dd}/${mm}/${yy}`; 
}

// Mostra dashboard no início
showSection('dashboard');

