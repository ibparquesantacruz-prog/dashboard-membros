// Variáveis globais
let membros = [];
let currentPage = 1;
const itemsPerPage = 10;
let memberToDelete = null;
let statusChart, sexoChart;

// Mapeamento dos campos
const fieldMapping = {
    'casdastro': 'casdastro', 'Nm_Membro': 'Nm_Membro', 'Status': 'Status', 'Tem_Filhos': 'Tem_Filhos', 'Sexo': 'Sexo',
    'Membro': 'Membro', 'Batizado': 'Batizado', 'Celular': 'Celular', 'Data_Nasc': 'Data_Nasc', 'CPF': 'CPF',
    'Naturalidade': 'Naturalidade', 'Estado_Civil': 'Estado_Civil', 'Escolaridade': 'Escolaridade', 'Profissao': 'Profissao',
    'Nm_Conjuge': 'Nm_Conjuge', 'Endereco': 'Endereco', 'Comp_Endereco': 'Comp_Endereco', 'Bairro': 'Bairro',
    'Cidade': 'Cidade', 'CEP': 'CEP', 'Nm_Mae': 'Nm_Mae', 'Nm_Pai': 'Nm_Pai'
};

document.addEventListener('DOMContentLoaded', () => initializeApp());

async function initializeApp() {
    setupNavigation();
    setupEventListeners();
    await fetchMembros();
}

async function fetchMembros() {
    try {
        const response = await fetch('/api/membros');
        if (!response.ok) throw new Error('Falha na resposta da API');
        membros = await response.json();
        updateDashboard();
        renderMembrosTable();
    } catch (e) {
        console.error('Erro ao buscar membros:', e);
        showErrorModal('Erro ao carregar os dados. Verifique a conexão com a API e o banco de dados.');
    }
}

function setupNavigation() {
    document.querySelectorAll('.sidebar a.nav-link[data-bs-target]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-bs-target');
            document.querySelectorAll('.sidebar a.nav-link[data-bs-target]').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.content-section').forEach(section => section.classList.add('d-none'));
            document.getElementById(`${targetId}-section`).classList.remove('d-none');
        });
    });
}

function setupEventListeners() {
    // Botão "Adicionar Membro" - Prepara o modal para um novo registo
    document.querySelector('button[data-bs-target="#adicionarMembroModal"]').addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Adicionar Novo Membro';
        document.getElementById('membroForm').reset();
        document.getElementById('membroForm').classList.remove('was-validated');
        document.getElementById('membroId').value = ''; // Garante que o ID está vazio
    });

    document.getElementById('saveMembroBtn').addEventListener('click', saveMembro);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

    // Outros listeners
    document.getElementById('importCsvBtn').addEventListener('click', importCSV);
    document.getElementById('clearCsvBtn').addEventListener('click', clearCSV);
    document.getElementById('searchInput').addEventListener('input', renderMembrosTable);
    document.getElementById('statusFilter').addEventListener('change', renderMembrosTable);
    document.getElementById('membroFilter').addEventListener('change', renderMembrosTable);
    document.getElementById('gerarRelatorioBtn').addEventListener('click', generateReport);
    document.getElementById('exportarRelatorioBtn').addEventListener('click', exportReport);
    document.getElementById('backupBtn').addEventListener('click', backupData);
    document.getElementById('restoreBtn').addEventListener('click', triggerRestore);
    document.getElementById('restoreFile').addEventListener('change', restoreData);
}

// Botões de Edição na tabela - Prepara o modal para edição
function prepareEdit(memberId) {
    const membro = membros.find(m => String(m.casdastro) === String(memberId));
    if (!membro) return;

    const form = document.getElementById('membroForm');
    form.reset();
    form.classList.remove('was-validated');

    document.getElementById('modalTitle').textContent = 'Editar Membro';
    document.getElementById('membroId').value = membro.casdastro; // Define o ID para a edição

    for (const key in membro) {
        const element = document.getElementById(key);
        if (element && membro[key] !== null) {
            element.value = membro[key];
        }
    }
    
    new bootstrap.Modal(document.getElementById('adicionarMembroModal')).show();
}

async function saveMembro() {
    const form = document.getElementById('membroForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const memberId = document.getElementById('membroId').value;
    const membroData = {};
    Object.keys(fieldMapping).forEach(field => {
        const element = document.getElementById(field);
        if (element) membroData[field] = element.value || null;
    });

    try {
        const method = memberId ? 'PUT' : 'POST';
        const response = await fetch('/api/membros', {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(membroData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao salvar o membro.');
        }

        bootstrap.Modal.getInstance(document.getElementById('adicionarMembroModal')).hide();
        showSuccessModal('Registro salvo com sucesso!');
        await fetchMembros(); // Recarrega os dados para mostrar a alteração

    } catch (e) {
        console.error('Erro ao salvar membro:', e);
        showErrorModal(`Erro ao salvar o registro: ${e.message}`);
    }
}

function renderMembrosTable() {
    if (!membros) return;
    const tableBody = document.getElementById('membrosTableBody');
    tableBody.innerHTML = '';

    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const membroFilter = document.getElementById('membroFilter').value;

    const filteredMembros = membros.filter(membro => {
        const matchesSearch = (membro.Nm_Membro || '').toLowerCase().includes(searchTerm);
        const matchesStatus = !statusFilter || membro.Status === statusFilter;
        const matchesMembro = !membroFilter || membro.Membro === membroFilter;
        return matchesSearch && matchesStatus && matchesMembro;
    });

    const totalPages = Math.ceil(filteredMembros.length / itemsPerPage);
    currentPage = Math.min(currentPage, totalPages || 1);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedMembros = filteredMembros.slice(startIndex, startIndex + itemsPerPage);

    paginatedMembros.forEach(membro => {
        const row = document.createElement('tr');
        const statusColor = membro.Status === 'Ativo' ? 'bg-success' : (membro.Status === 'Inativo' ? 'bg-secondary' : 'bg-danger');
        row.innerHTML = `
            <td>${membro.Nm_Membro || 'Nome não informado'}</td>
            <td><span class="badge ${statusColor}">${membro.Status || '-'}</span></td>
            <td>${membro.Sexo || '-'}</td>
            <td>${membro.Membro || '-'}</td>
            <td>${membro.Batizado || '-'}</td>
            <td>${membro.Celular || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${membro.casdastro}" title="Editar"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${membro.casdastro}" title="Excluir"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => prepareEdit(btn.dataset.id)));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => showDeleteConfirm(btn.dataset.id)));

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    if (totalPages <= 1) return;

    function createPageItem(text, page, isDisabled = false, isActive = false) {
        const li = document.createElement('li');
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.innerHTML = text;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            if (!isDisabled) {
                currentPage = page;
                renderMembrosTable();
            }
        });
        li.appendChild(a);
        return li;
    }

    pagination.appendChild(createPageItem('Anterior', currentPage - 1, currentPage === 1));
    for (let i = 1; i <= totalPages; i++) {
        pagination.appendChild(createPageItem(i, i, false, currentPage === i));
    }
    pagination.appendChild(createPageItem('Próximo', currentPage + 1, currentPage === totalPages));
}


function updateDashboard() {
    if (!membros) return;
    document.getElementById('total-membros').textContent = membros.length;
    
    const ativos = membros.filter(m => m.Status === 'Ativo').length;
    document.getElementById('ativos').textContent = ativos;
    
    const batizados = membros.filter(m => m.Batizado === 'Sim').length;
    document.getElementById('batizados').textContent = batizados;
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const aniversariantes = membros.filter(m => {
        if (!m.Data_Nasc) return false;
        const dataNasc = new Date(m.Data_Nasc + 'T00:00:00');
        return dataNasc.getMonth() + 1 === mesAtual;
    }).length;
    document.getElementById('aniversariantes').textContent = aniversariantes;
    
    updateCharts();
}

function updateCharts() {
    if (!membros) return;
    const statusCounts = {
        'Ativo': membros.filter(m => m.Status === 'Ativo').length,
        'Inativo': membros.filter(m => m.Status === 'Inativo').length,
        'Falecido': membros.filter(m => m.Status === 'Falecido').length
    };
    
    const sexoCounts = {
        'Masculino': membros.filter(m => m.Sexo === 'Masculino').length,
        'Feminino': membros.filter(m => m.Sexo === 'Feminino').length
    };
    
    if (statusChart) statusChart.destroy();
    if (sexoChart) sexoChart.destroy();
    
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Ativo', 'Inativo', 'Falecido'],
            datasets: [{ data: [statusCounts.Ativo, statusCounts.Inativo, statusCounts.Falecido], backgroundColor: ['#1cc88a', '#858796', '#e74a3b'] }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
    
    const sexoCtx = document.getElementById('sexoChart').getContext('2d');
    sexoChart = new Chart(sexoCtx, {
        type: 'pie',
        data: {
            labels: ['Masculino', 'Feminino'],
            datasets: [{ data: [sexoCounts.Masculino, sexoCounts.Feminino], backgroundColor: ['#4e73df', '#f06292'] }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

async function confirmDelete() {
    if (!memberToDelete) return;
    
    try {
        const response = await fetch('/api/membros', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ casdastro: memberToDelete })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao excluir o membro.');
        }
        
        bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')).hide();
        showSuccessModal('Membro excluído com sucesso!');
        await fetchMembros();
    } catch (e) {
        console.error('Erro ao excluir membro:', e);
        showErrorModal(`Erro ao excluir o registro: ${e.message}`);
    } finally {
        memberToDelete = null;
    }
}

function showSuccessModal(message) {
    document.getElementById('successMessage').textContent = message;
    new bootstrap.Modal(document.getElementById('successModal')).show();
}

function showErrorModal(message) {
    document.getElementById('errorMessage').textContent = message;
    new bootstrap.Modal(document.getElementById('errorModal')).show();
}

function showDeleteConfirm(memberId) {
    memberToDelete = memberId;
    new bootstrap.Modal(document.getElementById('confirmDeleteModal')).show();
}

// Funções de importação, exportação e backup (sem alterações)
function importCSV(){/*...código anterior...*/ }
function clearCSV(){/*...código anterior...*/ }
function debugCSV(file){/*...código anterior...*/ }
function formatarData(data){/*...código anterior...*/ }
function formatarCPF(cpf){/*...código anterior...*/ }
function normalizeYesNo(value){/*...código anterior...*/ }
function normalizeSexo(value){/*...código anterior...*/ }
function normalizeStatus(value){/*...código anterior...*/ }
function showPreview(data){/*...código anterior...*/ }
function generateReport(){/*...código anterior...*/ }
function calculatePercentage(data, field){/*...código anterior...*/ }
function exportReport(){/*...código anterior...*/ }
function backupData(){/*...código anterior...*/ }
function downloadCSV(csvContent, fileName){/*...código anterior...*/ }
function triggerRestore(){/*...código anterior...*/ }
function restoreData(evt){/*...código anterior...*/ }
