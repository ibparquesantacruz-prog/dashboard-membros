Olá! Com certeza posso ajudar a analisar o seu código e resolver esse problema de conexão. É um problema bastante comum ao integrar um frontend com um backend e banco de dados em plataformas como a Vercel.

Vamos analisar o que está acontecendo e corrigir o que for necessário.

Panorama Geral da Solução
O erro "Erro ao carregar os dados. Verifique a conexão." que você está a ver é uma mensagem genérica de falha na função fetchMembros() no seu script.js. Isso significa que a requisição do seu site (frontend) para a sua API no Vercel (/api/membros) está a falhar.

As causas mais prováveis são:

Problema de Conexão da API com o Banco de Dados: A sua função serverless na Vercel não está a conseguir conectar-se ao banco de dados Neon. Isso geralmente ocorre por falta de configuração das variáveis de ambiente no projeto Vercel.

Inconsistência na Lógica de Backup e Restauração: Identifiquei uma falha na sua lógica: a função de backup cria um arquivo CSV, mas a de restauração espera um arquivo JSON. Isso causaria um erro ao tentar restaurar os dados.

Lógica de Importação Destrutiva: A sua API de importação em massa (membros-bulk.js) primeiro apaga todos os dados da tabela (TRUNCATE TABLE) antes de inserir os novos. Isso é muito arriscado. Vamos melhorar isso para que a importação atualize os registos existentes e adicione apenas os novos, sem apagar tudo.

Vamos corrigir esses pontos. Abaixo estão os códigos completos e ajustados para cada arquivo que precisa de alteração.

Passo 1: Correção dos Códigos
Aqui estão as versões corrigidas dos seus arquivos. Apenas os arquivos que precisavam de mudanças (script.js e api/membros-bulk.js) foram alterados. Os outros estão corretos.

script.js Corrigido
Copie e cole todo o conteúdo abaixo no seu arquivo script.js.

JavaScript

// Variáveis globais
let membros = [];
let currentPage = 1;
const itemsPerPage = 10;
let memberToDelete = null;
let statusChart, sexoChart;

// Mapeamento dos campos do CSV para os campos do sistema
const fieldMapping = {
    'casdastro': 'casdastro',
    'Nm_Membro': 'Nm_Membro',
    'Status': 'Status',
    'Tem_Filhos': 'Tem_Filhos',
    'Sexo': 'Sexo',
    'Membro': 'Membro',
    'Batizado': 'Batizado',
    'Celular': 'Celular',
    'Data_Nasc': 'Data_Nasc',
    'CPF': 'CPF',
    'Naturalidade': 'Naturalidade',
    'Estado_Civil': 'Estado_Civil',
    'Escolaridade': 'Escolaridade',
    'Profissao': 'Profissao',
    'Nm_Conjuge': 'Nm_Conjuge',
    'Endereco': 'Endereco',
    'Comp_Endereco': 'Comp_Endereco',
    'Bairro': 'Bairro',
    'Cidade': 'Cidade',
    'CEP': 'CEP',
    'Nm_Mae': 'Nm_Mae',
    'Nm_Pai': 'Nm_Pai'
};

// Inicialização quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Carregar dados da API
    await fetchMembros();

    // Configurar navegação
    setupNavigation();

    // Configurar eventos
    setupEventListeners();
}

async function fetchMembros() {
    try {
        const response = await fetch('/api/membros');
        if (!response.ok) {
            // Tenta obter mais detalhes do erro da API
            const errorData = await response.json().catch(() => null);
            console.error('Erro da API:', errorData);
            throw new Error(`Erro ao carregar os dados da API. Status: ${response.status}`);
        }
        membros = await response.json();
        updateDashboard();
        renderMembrosTable();
    } catch (e) {
        console.error('Erro ao buscar membros:', e);
        showErrorModal('Erro ao carregar os dados. Verifique a conexão com a API e o banco de dados.');
    }
}

function setupNavigation() {
    // Navegação do menu lateral
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-bs-target');
            if (!targetId) return; // Ignora links sem target, como Backup e Restaurar

            // Ativar link clicado e desativar outros
            document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar seção correspondente e esconder outras
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.add('d-none');
            });
            document.getElementById(`${targetId}-section`).classList.remove('d-none');
        });
    });
}

function setupEventListeners() {
    // Importar CSV
    document.getElementById('importCsvBtn').addEventListener('click', importCSV);
    document.getElementById('clearCsvBtn').addEventListener('click', clearCSV);
    
    // Buscar membros
    document.getElementById('searchInput').addEventListener('input', renderMembrosTable);
    document.getElementById('statusFilter').addEventListener('change', renderMembrosTable);
    document.getElementById('membroFilter').addEventListener('change', renderMembrosTable);
    
    // Salvar membro
    document.getElementById('saveMembroBtn').addEventListener('click', saveMembro);
    
    // Gerar relatório
    document.getElementById('gerarRelatorioBtn').addEventListener('click', generateReport);
    document.getElementById('exportarRelatorioBtn').addEventListener('click', exportReport);
    
    // Confirmação de exclusão
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    
    // Backup e restauração
    document.getElementById('backupBtn').addEventListener('click', backupData);
    document.getElementById('restoreBtn').addEventListener('click', triggerRestore);
    document.getElementById('restoreFile').addEventListener('change', restoreData);
}

function importCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showErrorModal('Por favor, selecione um arquivo CSV.');
        return;
    }
    
    const statusCard = document.getElementById('importStatusCard');
    const progressBar = document.getElementById('importProgress');
    const statusText = document.getElementById('importStatusText');
    
    statusCard.classList.remove('d-none');
    progressBar.style.width = '10%';
    progressBar.textContent = '10%';
    statusText.textContent = 'Iniciando importação...';

    debugCSV(file);

    Papa.parse(file, {
        header: true,
        delimiter: ';', 
        encoding: 'UTF-8',
        skipEmptyLines: true,
        transformHeader: header => header.trim(),
        complete: async function(results) {
            if (results.errors && results.errors.length > 0) {
                console.error('Erros de parsing do CSV:', results.errors);
                showErrorModal(`Erro ao ler o arquivo CSV: ${results.errors[0].message}`);
                statusCard.classList.add('d-none');
                return;
            }
            if (results.data && results.data.length > 0) {
                progressBar.style.width = '50%';
                progressBar.textContent = '50%';
                statusText.textContent = 'Processando dados...';
                
                const novosMembros = results.data.map(row => {
                    let memberData = {};
                    for (const key in fieldMapping) {
                        memberData[key] = row[key] || '';
                    }
                    
                    memberData.Tem_Filhos = normalizeYesNo(row.Tem_Filhos || 'Não');
                    memberData.Sexo = normalizeSexo(row.Sexo || '');
                    memberData.Membro = normalizeYesNo(row.Membro || 'Não');
                    memberData.Batizado = normalizeYesNo(row.Batizado || 'Não');
                    memberData.Status = normalizeStatus(row.Status || 'Ativo');
                    if (row.Data_Nasc) memberData.Data_Nasc = formatarData(row.Data_Nasc);
                    if (row.CPF) memberData.CPF = formatarCPF(row.CPF);
                    
                    return memberData;
                }).filter(membro => membro.Nm_Membro && membro.Nm_Membro.trim() !== '');
                
                if (novosMembros.length > 0) {
                    try {
                        const response = await fetch('/api/membros-bulk', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(novosMembros)
                        });
                        
                        if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.message || 'Erro ao enviar dados para a API.');
                        }
                        
                        await fetchMembros(); 

                        progressBar.style.width = '100%';
                        progressBar.textContent = '100%';
                        statusText.textContent = 'Processamento concluído!';
                        
                        showPreview(novosMembros);
                        showSuccessModal(`Importação concluída com sucesso! ${novosMembros.length} registros processados.`);
                    } catch (e) {
                        console.error('Erro na importação em massa:', e);
                        showErrorModal('Erro ao salvar os dados no banco de dados: ' + e.message);
                    }
                } else {
                    showErrorModal('Nenhum dado válido encontrado no arquivo.');
                }
                
            } else {
                showErrorModal('O arquivo CSV está vazio ou em formato inválido.');
            }
            
            setTimeout(() => {
                statusCard.classList.add('d-none');
            }, 3000);
            
            fileInput.value = '';
        },
        error: function(error) {
            console.error('Erro ao processar CSV:', error);
            showErrorModal('Erro ao processar o arquivo CSV: ' + error.message);
            fileInput.value = '';
            statusCard.classList.add('d-none');
        }
    });
}

function normalizeYesNo(value) {
    const lowerValue = String(value).toLowerCase().trim();
    if (['sim', 's', 'true', 't', '1'].includes(lowerValue)) return 'Sim';
    return 'Não';
}

function normalizeSexo(value) {
    const lowerValue = String(value).toLowerCase().trim();
    if (['masculino', 'm', 'homem'].includes(lowerValue)) return 'Masculino';
    if (['feminino', 'f', 'mulher'].includes(lowerValue)) return 'Feminino';
    return value; // Retorna original se não reconhecido
}

function normalizeStatus(value) {
    const lowerValue = String(value).toLowerCase().trim();
    if (['ativo', 'a'].includes(lowerValue)) return 'Ativo';
    if (['inativo', 'i'].includes(lowerValue)) return 'Inativo';
    if (['falecido', 'f'].includes(lowerValue)) return 'Falecido';
    return value; // Retorna original se não reconhecido
}

function debugCSV(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const debugInfo = document.getElementById('debugInfo');
        const debugContent = document.getElementById('debugContent');
        
        debugInfo.style.display = 'block';
        debugContent.innerHTML = `
            <p><strong>Primeiras 5 linhas:</strong></p>
            <pre>${content.split('\n').slice(0, 5).join('\n')}</pre>
        `;
    };
    reader.readAsText(file, 'UTF-8');
}

function formatarData(data) {
    if (!data) return '';
    // Formato AAAA-MM-DD (já está correto)
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
    // Formato DD/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
        const [dia, mes, ano] = data.split('/');
        return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
    // Tenta converter outros formatos
    try {
        const dataObj = new Date(data);
        if (!isNaN(dataObj.getTime())) return dataObj.toISOString().split('T')[0];
    } catch (e) { /* ignora erro */ }
    return data; // Retorna original se não conseguir formatar
}

function formatarCPF(cpf) {
    if (!cpf) return '';
    const apenasNumeros = cpf.toString().replace(/\D/g, '');
    if (apenasNumeros.length !== 11) return cpf; // Retorna original se inválido
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function clearCSV() {
    document.getElementById('csvFile').value = '';
    document.getElementById('previewTableBody').innerHTML = '';
    document.getElementById('importStatusCard').classList.add('d-none');
    document.getElementById('debugInfo').style.display = 'none';
}

function showPreview(data) {
    const previewBody = document.getElementById('previewTableBody');
    previewBody.innerHTML = '';
    const previewData = data.slice(0, 5);
    previewData.forEach(membro => {
        const row = document.createElement('tr');
        const statusColor = membro.Status === 'Ativo' ? 'bg-success' : (membro.Status === 'Inativo' ? 'bg-secondary' : 'bg-danger');
        row.innerHTML = `
            <td>${membro.Nm_Membro}</td>
            <td><span class="badge ${statusColor}">${membro.Status}</span></td>
            <td>${membro.Sexo}</td>
            <td>${membro.Membro}</td>
            <td>${membro.Batizado}</td>
            <td>${membro.Celular}</td>
            <td><span class="badge bg-info">Novo</span></td>
        `;
        previewBody.appendChild(row);
    });
}

function updateDashboard() {
    document.getElementById('total-membros').textContent = membros.length;
    
    const ativos = membros.filter(m => m.Status === 'Ativo').length;
    document.getElementById('ativos').textContent = ativos;
    
    const batizados = membros.filter(m => m.Batizado === 'Sim').length;
    document.getElementById('batizados').textContent = batizados;
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const aniversariantes = membros.filter(m => {
        if (!m.Data_Nasc) return false;
        // Adiciona 'T00:00:00' para evitar problemas com fuso horário
        const dataNasc = new Date(m.Data_Nasc + 'T00:00:00');
        return dataNasc.getMonth() + 1 === mesAtual;
    }).length;
    document.getElementById('aniversariantes').textContent = aniversariantes;
    
    updateCharts();
}

function updateCharts() {
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
            datasets: [{
                data: [statusCounts.Ativo, statusCounts.Inativo, statusCounts.Falecido],
                backgroundColor: ['#1cc88a', '#858796', '#e74a3b'],
            }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
    
    const sexoCtx = document.getElementById('sexoChart').getContext('2d');
    sexoChart = new Chart(sexoCtx, {
        type: 'pie',
        data: {
            labels: ['Masculino', 'Feminino'],
            datasets: [{
                data: [sexoCounts.Masculino, sexoCounts.Feminino],
                backgroundColor: ['#4e73df', '#f06292'],
            }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

function renderMembrosTable() {
    const tableBody = document.getElementById('membrosTableBody');
    tableBody.innerHTML = '';
    
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const membroFilter = document.getElementById('membroFilter').value;
    
    const filteredMembros = membros.filter(membro => {
        const matchesSearch = membro.Nm_Membro.toLowerCase().includes(searchTerm);
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
            <td>${membro.Nm_Membro}</td>
            <td><span class="badge ${statusColor}">${membro.Status}</span></td>
            <td>${membro.Sexo}</td>
            <td>${membro.Membro}</td>
            <td>${membro.Batizado}</td>
            <td>${membro.Celular || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${membro.casdastro}" title="Editar"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${membro.casdastro}" title="Excluir"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editMembro(btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => showDeleteConfirm(btn.dataset.id));
    });
    
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

function editMembro(memberId) {
    const membro = membros.find(m => m.casdastro == memberId);
    if (!membro) return;
    
    document.getElementById('membroForm').reset();
    document.getElementById('membroForm').classList.remove('was-validated');

    document.getElementById('modalTitle').textContent = 'Editar Membro';
    document.getElementById('membroId').value = membro.casdastro;

    for (const key in membro) {
        const element = document.getElementById(key);
        if (element) {
            element.value = membro[key];
        }
    }
    
    const modal = new bootstrap.Modal(document.getElementById('adicionarMembroModal'));
    modal.show();
}

async function saveMembro() {
    const form = document.getElementById('membroForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const memberId = document.getElementById('membroId').value;
    const membroData = {};
    const formFields = Object.keys(fieldMapping);

    formFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            membroData[field] = element.value || null;
        }
    });
    
    try {
        let response;
        if (memberId) {
            response = await fetch('/api/membros', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(membroData)
            });
        } else {
            response = await fetch('/api/membros', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(membroData)
            });
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao salvar o membro.');
        }
        
        await fetchMembros();
        bootstrap.Modal.getInstance(document.getElementById('adicionarMembroModal')).hide();
        showSuccessModal('Registro salvo com sucesso!');

    } catch (e) {
        console.error('Erro ao salvar membro:', e);
        showErrorModal(`Erro ao salvar o registro: ${e.message}`);
    }
}

function showSuccessModal(message) {
    document.getElementById('successMessage').textContent = message;
    const modal = new bootstrap.Modal(document.getElementById('successModal'));
    modal.show();
}

function showErrorModal(message) {
    document.getElementById('errorMessage').textContent = message;
    const modal = new bootstrap.Modal(document.getElementById('errorModal'));
    modal.show();
}

function showDeleteConfirm(memberId) {
    memberToDelete = memberId;
    const modal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    modal.show();
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
        
        await fetchMembros();
        bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')).hide();
        showSuccessModal('Membro excluído com sucesso!');
    } catch (e) {
        console.error('Erro ao excluir membro:', e);
        showErrorModal(`Erro ao excluir o registro: ${e.message}`);
    } finally {
        memberToDelete = null;
    }
}

function generateReport() {
    const reportType = document.getElementById('relatorioTipo').value;
    const relatorioHeader = document.getElementById('relatorioHeader');
    const relatorioBody = document.getElementById('relatorioBody');
    
    relatorioHeader.innerHTML = '';
    relatorioBody.innerHTML = '';
    
    let headers = [];
    
    if (reportType === 'aniversariantes') {
        const mes = prompt("Digite o número do mês (1-12):", new Date().getMonth() + 1);
        if (!mes || isNaN(mes) || mes < 1 || mes > 12) {
            showErrorModal("Mês inválido.");
            return;
        }

        headers = ['Nome do Membro', 'Data de Nascimento'];
        relatorioHeader.innerHTML = headers.map(h => `<th>${h}</th>`).join('');

        const aniversariantes = membros
            .filter(m => m.Data_Nasc && new Date(m.Data_Nasc + 'T00:00:00').getMonth() + 1 == mes)
            .sort((a, b) => new Date(a.Data_Nasc + 'T00:00:00').getDate() - new Date(b.Data_Nasc + 'T00:00:00').getDate());

        if (aniversariantes.length === 0) {
            relatorioBody.innerHTML = `<tr><td colspan="${headers.length}">Nenhum aniversariante encontrado para o mês ${mes}.</td></tr>`;
            return;
        }

        relatorioBody.innerHTML = aniversariantes.map(m => `<tr><td>${m.Nm_Membro}</td><td>${formatarData(m.Data_Nasc).split('-').reverse().join('/')}</td></tr>`).join('');
        return;
    }

    const reportConfig = {
        status: { field: 'Status', headers: ['Status', 'Quantidade', 'Percentual', 'Nomes'] },
        sexo: { field: 'Sexo', headers: ['Sexo', 'Quantidade', 'Percentual', 'Nomes'] },
        batismo: { field: 'Batizado', headers: ['Batizado', 'Quantidade', 'Percentual', 'Nomes'] },
        estadoCivil: { field: 'Estado_Civil', headers: ['Estado Civil', 'Quantidade', 'Percentual', 'Nomes'] },
        membro: { field: 'Membro', headers: ['Tipo de Membro', 'Quantidade', 'Percentual', 'Nomes'] }
    };
    
    const config = reportConfig[reportType];
    if (!config) return;

    relatorioHeader.innerHTML = config.headers.map(h => `<th>${h}</th>`).join('');
    const reportData = calculatePercentage(membros, config.field);

    for (const [key, value] of Object.entries(reportData)) {
        const nomes = membros.filter(m => (m[config.field] || 'Não informado') === key).map(m => m.Nm_Membro).join(", ");
        const row = document.createElement('tr');
        row.innerHTML = `<td>${key}</td><td>${value.count}</td><td>${value.percentage}%</td><td>${nomes}</td>`;
        relatorioBody.appendChild(row);
    }
}

function calculatePercentage(data, field) {
    const counts = {};
    data.forEach(item => {
        const value = item[field] || 'Não informado';
        counts[value] = (counts[value] || 0) + 1;
    });
    const total = data.length;
    return Object.fromEntries(
        Object.entries(counts).map(([key, count]) => [
            key,
            { count, percentage: total > 0 ? ((count / total) * 100).toFixed(2) : 0 }
        ])
    );
}

function exportReport() {
    const table = document.querySelector("#relatorios-section table");
    if (!table || table.querySelector("tbody").children.length === 0) {
        showErrorModal("Gere um relatório primeiro para poder exportar.");
        return;
    }
    let csv = [];
    table.querySelectorAll('tr').forEach(row => {
        let rowData = [];
        row.querySelectorAll('th, td').forEach(cell => {
            let text = cell.innerText.replace(/"/g, '""'); // Escapa aspas duplas
            if (/[",;\n]/.test(text)) {
                text = `"${text}"`; // Adiciona aspas se contiver caracteres especiais
            }
            rowData.push(text);
        });
        csv.push(rowData.join(';'));
    });
    const reportType = document.getElementById('relatorioTipo').value;
    downloadCSV(csv.join('\n'), `relatorio_${reportType}.csv`);
}

function backupData() {
    const headers = Object.keys(fieldMapping);
    let csv = headers.join(';') + '\n';
    
    membros.forEach(membro => {
        const row = headers.map(header => {
            const value = membro[header] || '';
            let escaped = String(value).replace(/"/g, '""');
            if (/[",;\n]/.test(escaped)) {
                escaped = `"${escaped}"`;
            }
            return escaped;
        }).join(';');
        csv += row + '\n';
    });

    downloadCSV(csv, `backup_membros_${new Date().toISOString().slice(0, 10)}.csv`);
}

function downloadCSV(csvContent, fileName) {
    // Adiciona BOM para garantir a codificação UTF-8 correta no Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function triggerRestore() {
    document.getElementById('restoreFile').click();
}

function restoreData(evt) {
    const file = evt.target.files[0];
    if (!file) return;

    // A função de restauração agora usa a mesma lógica da importação
    Papa.parse(file, {
        header: true,
        delimiter: ';',
        encoding: 'UTF-8',
        skipEmptyLines: true,
        transformHeader: header => header.trim(),
        complete: async function(results) {
            if (results.errors.length) {
                showErrorModal(`Erro ao ler o arquivo de restauração: ${results.errors[0].message}`);
                return;
            }

            const restoredData = results.data.filter(m => m.Nm_Membro && m.Nm_Membro.trim());
            if (restoredData.length > 0) {
                try {
                    const response = await fetch('/api/membros-bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(restoredData)
                    });
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.message || 'Erro na API de restauração');
                    }
                    await fetchMembros();
                    showSuccessModal('Dados restaurados com sucesso!');
                } catch (error) {
                    console.error('Erro ao restaurar dados:', error);
                    showErrorModal(`Erro ao restaurar dados: ${error.message}`);
                }
            } else {
                showErrorModal('O arquivo de restauração não contém dados válidos.');
            }
        },
        error: (error) => {
            showErrorModal(`Erro ao processar o arquivo de restauração: ${error.message}`);
        }
    });
    
    evt.target.value = ''; // Limpa o input para permitir selecionar o mesmo arquivo novamente
}
