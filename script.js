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
            throw new Error('Erro ao carregar os dados da API.');
        }
        membros = await response.json();
        updateDashboard();
        renderMembrosTable();
    } catch (e) {
        console.error('Erro ao buscar membros:', e);
        showErrorModal('Erro ao carregar os dados. Verifique a conexão.');
    }
}

function setupNavigation() {
    // Navegação do menu lateral
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-bs-target');
            
            // Ativar link clicado e desativar outros
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar seção correspondente e esconder outras
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.add('d-none');
            });
            document.getElementById(`${target}-section`).classList.remove('d-none');
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
        alert('Por favor, selecione um arquivo CSV.');
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
        newline: '\n',
        encoding: 'UTF-8',
        skipEmptyLines: true,
        transformHeader: function(header) {
            const normalizedHeader = header.trim().replace(/\s+/g, '_');
            return normalizedHeader;
        },
        complete: async function(results) {
            if (results.data && results.data.length > 0) {
                progressBar.style.width = '50%';
                progressBar.textContent = '50%';
                statusText.textContent = 'Processando dados...';
                
                const novosMembros = results.data.map((row, index) => {
                    let memberData = {};
                    for (const key in fieldMapping) {
                        memberData[key] = row[key] || '';
                    }
                    
                    const temFilhosValue = row.Tem_Filhos || '';
                    if (temFilhosValue) {
                        memberData.Tem_Filhos = normalizeYesNo(temFilhosValue);
                    } else {
                        const temFilhosInferred = (row.Nm_Mae && row.Nm_Mae.trim() !== '') || (row.Nm_Pai && row.Nm_Pai.trim() !== '');
                        memberData.Tem_Filhos = temFilhosInferred ? 'Sim' : 'Não';
                    }

                    if (memberData.Sexo) memberData.Sexo = normalizeSexo(memberData.Sexo);
                    if (memberData.Membro) memberData.Membro = normalizeYesNo(memberData.Membro);
                    if (memberData.Batizado) memberData.Batizado = normalizeYesNo(memberData.Batizado);

                    if(row.Status) {
                        memberData.Status = normalizeStatus(row.Status);
                    } else {
                        memberData.Status = 'Ativo';
                    }

                    if (memberData.Data_Nasc) {
                        memberData.Data_Nasc = formatarData(memberData.Data_Nasc);
                    }
                    
                    if (memberData.CPF) {
                        memberData.CPF = formatarCPF(memberData.CPF.toString());
                    }
                    
                    return memberData;
                }).filter(membro => membro.Nm_Membro);
                
                if (novosMembros.length > 0) {
                    try {
                        const response = await fetch('/api/membros-bulk', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(novosMembros)
                        });
                        
                        if (!response.ok) {
                            throw new Error('Erro ao enviar dados para a API.');
                        }
                        
                        await fetchMembros(); // Atualiza a lista da UI com os dados do banco de dados

                        progressBar.style.width = '100%';
                        progressBar.textContent = '100%';
                        statusText.textContent = 'Processamento concluído!';
                        
                        showPreview(novosMembros);
                        showSuccessModal('Importação concluída com sucesso! ' + novosMembros.length + ' registros processados.');
                    } catch (e) {
                        console.error('Erro na importação em massa:', e);
                        showErrorModal('Erro ao salvar os dados no banco de dados: ' + e.message);
                    }
                } else {
                    showErrorModal('Nenhum dado válido encontrado no arquivo.');
                }
                
            } else {
                let errorMsg = 'O arquivo CSV está vazio ou não pôde ser processado.';
                if (results.errors && results.errors.length) {
                    errorMsg += '\nErros: ' + results.errors.map(e => e.message).join(', ');
                }
                showErrorModal(errorMsg);
                console.error('Erros do PapaParse:', results.errors);
            }
            
            setTimeout(() => {
                statusCard.classList.add('d-none');
            }, 2000);
            
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
    if (lowerValue === 'sim' || lowerValue === 's' || lowerValue === 'true' || lowerValue === 't') {
        return 'Sim';
    }
    if (lowerValue === 'nao' || lowerValue === 'não' || lowerValue === 'n' || lowerValue === 'false' || lowerValue === 'f') {
        return 'Não';
    }
    return 'Não';
}

function normalizeSexo(value) {
    const lowerValue = String(value).toLowerCase().trim();
    if (lowerValue === 'masculino' || lowerValue === 'm' || lowerValue === 'homem') {
        return 'Masculino';
    }
    if (lowerValue === 'feminino' || lowerValue === 'f' || lowerValue === 'mulher') {
        return 'Feminino';
    }
    return value;
}

function normalizeStatus(value) {
    const lowerValue = String(value).toLowerCase().trim();
    if (lowerValue === 'ativo' || lowerValue === 'a') {
        return 'Ativo';
    }
    if (lowerValue === 'inativo' || lowerValue === 'i') {
        return 'Inativo';
    }
    if (lowerValue === 'falecido' || lowerValue === 'f') {
        return 'Falecido';
    }
    return value;
}

function debugCSV(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        console.log('Conteúdo bruto do arquivo:');
        console.log(content);
        
        const debugInfo = document.getElementById('debugInfo');
        const debugContent = document.getElementById('debugContent');
        
        debugInfo.style.display = 'block';
        debugContent.innerHTML = `
            <p><strong>Primeiras 5 linhas:</strong></p>
            <pre>${content.split('\n').slice(0, 5).join('\n')}</pre>
            <p><strong>Tamanho do arquivo:</strong> ${content.length} caracteres</p>
            <p><strong>Número de linhas:</strong> ${content.split('\n').length}</p>
        `;
    };
    reader.readAsText(file);
}

function formatarData(data) {
    if (!data) return '';
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return data;
    }
    
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
        const partes = data.split('/');
        return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
    }
    
    try {
        const dataObj = new Date(data);
        if (!isNaN(dataObj.getTime())) {
            return dataObj.toISOString().split('T')[0];
        }
    } catch (e) {
        console.error('Erro ao formatar data:', e);
    }
    
    return data;
}

function formatarCPF(cpf) {
    if (!cpf) return '';
    
    cpf = cpf.toString().replace(/\D/g, '');
    
    if (cpf.length === 11) {
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    
    return cpf;
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
        row.innerHTML = `
            <td>${membro.Nm_Membro}</td>
            <td><span class="badge ${membro.Status === 'Ativo' ? 'bg-success' : membro.Status === 'Inativo' ? 'bg-secondary' : 'bg-danger'}">${membro.Status}</span></td>
            <td>${membro.Sexo}</td>
            <td>${membro.Membro}</td>
            <td>${membro.Batizado}</td>
            <td>${membro.Celular}</td>
            <td>${membro.Status}</td>
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
        const dataNasc = new Date(m.Data_Nasc);
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
    
    if (statusChart) {
        statusChart.destroy();
    }
    if (sexoChart) {
        sexoChart.destroy();
    }
    
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Ativo', 'Inativo', 'Falecido'],
            datasets: [{
                data: [statusCounts.Ativo, statusCounts.Inativo, statusCounts.Falecido],
                backgroundColor: ['#4e73df', '#858796', '#e74a3b'],
                hoverBackgroundColor: ['#2e59d9', '#60616f', '#e74a3b'],
                hoverBorderColor: "rgba(234, 236, 244, 1)",
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    const sexoCtx = document.getElementById('sexoChart').getContext('2d');
    sexoChart = new Chart(sexoCtx, {
        type: 'pie',
        data: {
            labels: ['Masculino', 'Feminino'],
            datasets: [{
                data: [sexoCounts.Masculino, sexoCounts.Feminino],
                backgroundColor: ['#4e73df', '#36b9cc'],
                hoverBackgroundColor: ['#2e59d9', '#2c9faf'],
                hoverBorderColor: "rgba(234, 236, 244, 1)",
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderMembrosTable() {
    const tableBody = document.getElementById('membrosTableBody');
    tableBody.innerHTML = '';
    
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const membroFilter = document.getElementById('membroFilter').value;
    
    let filteredMembros = membros.filter(membro => {
        const matchesSearch = membro.Nm_Membro.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === '' || membro.Status === statusFilter;
        const matchesMembro = membroFilter === '' || membro.Membro === membroFilter;
        
        return matchesSearch && matchesStatus && matchesMembro;
    });
    
    const totalPages = Math.ceil(filteredMembros.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredMembros.length);
    const paginatedMembros = filteredMembros.slice(startIndex, endIndex);
    
    paginatedMembros.forEach(membro => {
        const row = document.createElement('tr');
        const statusColor = membro.Status === 'Ativo' ? 'bg-success' : (membro.Status === 'Inativo' ? 'bg-secondary' : 'bg-danger');
        row.innerHTML = `
            <td>${membro.Nm_Membro}</td>
            <td><span class="badge ${statusColor}">${membro.Status}</span></td>
            <td>${membro.Sexo}</td>
            <td>${membro.Membro}</td>
            <td>${membro.Batizado}</td>
            <td>${membro.Celular}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${membro.casdastro}">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${membro.casdastro}">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const memberId = this.getAttribute('data-id');
            editMembro(memberId);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const memberId = this.getAttribute('data-id');
            showDeleteConfirm(memberId);
        });
    });
    
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    const prevLi = document.createElement('li');
    prevLi.classList.add('page-item');
    if (currentPage === 1) prevLi.classList.add('disabled');
    prevLi.innerHTML = `<a class="page-link" href="#">Anterior</a>`;
    prevLi.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            renderMembrosTable();
        }
    });
    pagination.appendChild(prevLi);
    
    const maxPagesToShow = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.classList.add('page-item');
        if (currentPage === i) pageLi.classList.add('active');
        pageLi.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        pageLi.addEventListener('click', function(e) {
            e.preventDefault();
            currentPage = i;
            renderMembrosTable();
        });
        pagination.appendChild(pageLi);
    }
    
    const nextLi = document.createElement('li');
    nextLi.classList.add('page-item');
    if (currentPage === totalPages) nextLi.classList.add('disabled');
    nextLi.innerHTML = `<a class="page-link" href="#">Próximo</a>`;
    nextLi.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentPage < totalPages) {
            currentPage++;
            renderMembrosTable();
        }
    });
    pagination.appendChild(nextLi);
}

function editMembro(memberId) {
    const membro = membros.find(m => m.casdastro === memberId);
    if (!membro) return;
    
    document.getElementById('modalTitle').textContent = 'Editar Membro';
    document.getElementById('membroId').value = memberId;
    document.getElementById('casdastro').value = membro.casdastro;
    document.getElementById('Nm_Membro').value = membro.Nm_Membro;
    document.getElementById('Status').value = membro.Status;
    document.getElementById('Tem_Filhos').value = membro.Tem_Filhos;
    document.getElementById('Sexo').value = membro.Sexo;
    document.getElementById('Membro').value = membro.Membro;
    document.getElementById('Batizado').value = membro.Batizado;
    document.getElementById('Celular').value = membro.Celular;
    document.getElementById('Data_Nasc').value = membro.Data_Nasc;
    document.getElementById('CPF').value = membro.CPF;
    document.getElementById('Naturalidade').value = membro.Naturalidade;
    document.getElementById('Estado_Civil').value = membro.Estado_Civil;
    document.getElementById('Escolaridade').value = membro.Escolaridade;
    document.getElementById('Profissao').value = membro.Profissao;
    document.getElementById('Nm_Conjuge').value = membro.Nm_Conjuge;
    document.getElementById('Endereco').value = membro.Endereco;
    document.getElementById('Comp_Endereco').value = membro.Comp_Endereco;
    document.getElementById('Bairro').value = membro.Bairro;
    document.getElementById('Cidade').value = membro.Cidade;
    document.getElementById('CEP').value = membro.CEP;
    document.getElementById('Nm_Mae').value = membro.Nm_Mae;
    document.getElementById('Nm_Pai').value = membro.Nm_Pai;
    
    document.getElementById('membroForm').classList.remove('was-validated');
    
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
    const casdastroValue = document.getElementById('casdastro').value;

    const membroData = {
        casdastro: casdastroValue,
        Nm_Membro: document.getElementById('Nm_Membro').value,
        Status: document.getElementById('Status').value,
        Tem_Filhos: document.getElementById('Tem_Filhos').value,
        Sexo: document.getElementById('Sexo').value,
        Membro: document.getElementById('Membro').value,
        Batizado: document.getElementById('Batizado').value,
        Celular: document.getElementById('Celular').value,
        Data_Nasc: document.getElementById('Data_Nasc').value,
        CPF: document.getElementById('CPF').value,
        Naturalidade: document.getElementById('Naturalidade').value,
        Estado_Civil: document.getElementById('Estado_Civil').value,
        Escolaridade: document.getElementById('Escolaridade').value,
        Profissao: document.getElementById('Profissao').value,
        Nm_Conjuge: document.getElementById('Nm_Conjuge').value,
        Endereco: document.getElementById('Endereco').value,
        Comp_Endereco: document.getElementById('Comp_Endereco').value,
        Bairro: document.getElementById('Bairro').value,
        Cidade: document.getElementById('Cidade').value,
        CEP: document.getElementById('CEP').value,
        Nm_Mae: document.getElementById('Nm_Mae').value,
        Nm_Pai: document.getElementById('Nm_Pai').value,
    };
    
    try {
        let response;
        if (memberId) {
            // Editar membro existente
            response = await fetch('/api/membros', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(membroData)
            });
        } else {
            // Adicionar novo membro
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
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('adicionarMembroModal'));
        modal.hide();
        
        document.getElementById('membroForm').reset();
        document.getElementById('membroId').value = '';
        form.classList.remove('was-validated');
        
        showSuccessModal('Registro salvo com sucesso!');
    } catch (e) {
        console.error('Erro ao salvar membro:', e);
        showErrorModal('Erro ao salvar o registro: ' + e.message);
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
            throw new Error('Erro ao excluir o membro.');
        }
        
        await fetchMembros();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
        modal.hide();
        
        showSuccessModal('Membro excluído com sucesso!');
    } catch (e) {
        console.error('Erro ao excluir membro:', e);
        showErrorModal('Erro ao excluir o registro: ' + e.message);
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
        const mes = prompt("Digite o número do mês (1-12):");
        if (!mes || isNaN(mes) || mes < 1 || mes > 12) {
            showErrorModal("Mês inválido.");
            return;
        }

        headers = ['Nome do Membro', 'Data de Nascimento'];
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            relatorioHeader.appendChild(th);
        });

        const aniversariantes = membros.filter(m => {
            if (!m.Data_Nasc) return false;
            const data = new Date(m.Data_Nasc);
            return (data.getMonth() + 1) == mes;
        }).sort((a,b) => {
            const da = new Date(a.Data_Nasc).getDate();
            const db = new Date(b.Data_Nasc).getDate();
            return da - db;
        });

        if (aniversariantes.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="2">Nenhum aniversariante encontrado para o mês ${mes}.</td>`;
            relatorioBody.appendChild(row);
            return;
        }

        aniversariantes.forEach(m => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${m.Nm_Membro}</td>
                <td>${m.Data_Nasc}</td>
            `;
            relatorioBody.appendChild(row);
        });

        return;
    }

    let field;
    switch (reportType) {
        case 'status':
            field = 'Status';
            headers = ['Status', 'Quantidade', 'Percentual', 'Nomes'];
            break;
        case 'sexo':
            field = 'Sexo';
            headers = ['Sexo', 'Quantidade', 'Percentual', 'Nomes'];
            break;
        case 'batismo':
            field = 'Batizado';
            headers = ['Batizado', 'Quantidade', 'Percentual', 'Nomes'];
            break;
        case 'estadoCivil':
            field = 'Estado_Civil';
            headers = ['Estado Civil', 'Quantidade', 'Percentual', 'Nomes'];
            break;
        case 'membro':
            field = 'Membro';
            headers = ['Tipo de Membro', 'Quantidade', 'Percentual', 'Nomes'];
            break;
    }
    
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        relatorioHeader.appendChild(th);
    });

    const reportData = calculatePercentage(membros, field);

    for (const [key, value] of Object.entries(reportData)) {
        const nomes = membros.filter(m => (m[field] || 'Não informado') === key).map(m => m.Nm_Membro).join(", ");
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${key}</td>
            <td>${value.count}</td>
            <td>${value.percentage}%</td>
            <td>${nomes}</td>
        `;
        relatorioBody.appendChild(row);
    }
}

function calculatePercentage(data, field) {
    const counts = {};
    
    data.forEach(item => {
        const value = item[field] || 'Não informado';
        counts[value] = (counts[value] || 0) + 1;
    });
    
    const result = {};
    const total = data.length;
    
    for (const [key, count] of Object.entries(counts)) {
        result[key] = {
            count: count,
            percentage: ((count / total) * 100).toFixed(2)
        };
    }
    
    return result;
}

function exportReport() {
    const reportType = document.getElementById('relatorioTipo').value;

    if (reportType === 'aniversariantes') {
        const mes = prompt("Digite o número do mês (1-12):");
        if (!mes || isNaN(mes) || mes < 1 || mes > 12) {
            showErrorModal("Mês inválido.");
            return;
        }

        const aniversariantes = membros.filter(m => {
            if (!m.Data_Nasc) return false;
            const data = new Date(m.Data_Nasc);
            return (data.getMonth() + 1) == mes;
        }).sort((a,b) => {
            const da = new Date(a.Data_Nasc).getDate();
            const db = new Date(b.Data_Nasc).getDate();
            return da - db;
        });

        let csv = 'Nome do Membro,Data de Nascimento\n';
        aniversariantes.forEach(m => {
            csv += `"${m.Nm_Membro}","${m.Data_Nasc}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_aniversariantes_mes_${mes}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }

    let field;
    let headerField = '';
    switch (reportType) {
        case 'status':
            field = 'Status';
            headerField = 'Status';
            break;
        case 'sexo':
            field = 'Sexo';
            headerField = 'Sexo';
            break;
        case 'batismo':
            field = 'Batizado';
            headerField = 'Batizado';
            break;
        case 'estadoCivil':
            field = 'Estado_Civil';
            headerField = 'Estado Civil';
            break;
        case 'membro':
            field = 'Membro';
            headerField = 'Tipo de Membro';
            break;
    }

    const reportData = calculatePercentage(membros, field);
    let csv = `${headerField},Quantidade,Percentual,Nomes\n`;

    for (const [key, value] of Object.entries(reportData)) {
        const nomes = membros.filter(m => (m[field] || 'Não informado') === key)
                                 .map(m => m.Nm_Membro).join("; ");
        const nomesEscapados = nomes.replace(/"/g, '""');
        csv += `"${key}",${value.count},${value.percentage}%,"${nomesEscapados}"\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${reportType}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function backupData() {
    // Mapeia os campos para a ordem desejada no CSV
    const headers = [
        'casdastro', 'Nm_Membro', 'Status', 'Tem_Filhos', 'Sexo', 'Membro', 'Batizado', 'Celular', 'Data_Nasc', 'CPF',
        'Naturalidade', 'Estado_Civil', 'Escolaridade', 'Profissao', 'Nm_Conjuge', 'Endereco', 'Comp_Endereco',
        'Bairro', 'Cidade', 'CEP', 'Nm_Mae', 'Nm_Pai'
    ];

    let csv = headers.join(';') + '\n';

    membros.forEach(membro => {
        const row = headers.map(header => {
            const value = membro[header] || '';
            let escapedValue = String(value).replace(/"/g, '""').replace(/\r?\n|\r/g, ' ');
            if (escapedValue.includes(';') || escapedValue.includes('"')) {
                return `"${escapedValue}"`;
            } else {
                return escapedValue;
            }
        }).join(';');
        csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const linkElement = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', `backup_membros_${new Date().toISOString().slice(0,10)}.csv`);
    linkElement.style.visibility = 'hidden';
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
}


function triggerRestore() {
    document.getElementById('restoreFile').click();
}

function restoreData(evt) {
    const file = evt.target.files[0];
    
    if (!file) {
        return;
    }
    
    // Agora o restore precisa de um arquivo JSON
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const contents = e.target.result;
            const restoredData = JSON.parse(contents);
            
            if (Array.isArray(restoredData)) {
                // Enviar os dados para a API
                fetch('/api/membros-bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(restoredData)
                }).then(response => {
                    if (response.ok) {
                        return fetchMembros();
                    } else {
                        throw new Error('Erro ao restaurar dados via API.');
                    }
                }).then(() => {
                    showSuccessModal('Dados restaurados com sucesso!');
                }).catch(error => {
                    console.error('Erro ao restaurar dados:', error);
                    showErrorModal('Erro ao restaurar dados. Verifique se o arquivo e a API são válidos.');
                });

            } else {
                showErrorModal('O arquivo não contém dados JSON válidos.');
            }
        } catch (error) {
            console.error('Erro ao restaurar dados:', error);
            showErrorModal('Erro ao restaurar dados. Verifique se o arquivo é válido.');
        }
    };
    reader.readAsText(file);
    
    evt.target.value = '';
}
