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

function initializeApp() {
    // Carregar dados do localStorage se existirem
    const savedData = localStorage.getItem('membrosData');
    if (savedData) {
        try {
            membros = JSON.parse(savedData);
            updateDashboard();
            renderMembrosTable();
        } catch (e) {
            console.error('Erro ao carregar dados:', e);
            membros = [];
        }
    }

    // Configurar navegação
    setupNavigation();

    // Configurar eventos
    setupEventListeners();
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
    
    // Mostrar barra de progresso
    const statusCard = document.getElementById('importStatusCard');
    const progressBar = document.getElementById('importProgress');
    const statusText = document.getElementById('importStatusText');
    
    statusCard.classList.remove('d-none');
    progressBar.style.width = '10%';
    progressBar.textContent = '10%';
    statusText.textContent = 'Iniciando importação...';

    // Primeiro, fazer debug do arquivo
    debugCSV(file);

    // Configurações robustas para o PapaParse
    Papa.parse(file, {
        header: true,
        delimiter: ';', // Força ponto e vírgula como delimitador
        newline: '\n',
        encoding: 'UTF-8',
        skipEmptyLines: true,
        transformHeader: function(header) {
            // Normaliza os cabeçalhos para remover acentos e espaços, e manter a capitalização
            const normalizedHeader = header.trim().replace(/\s+/g, '_');
            return normalizedHeader;
        },
        complete: function(results) {
            console.log('Resultado completo do parsing:', results);
            
            if (results.data && results.data.length > 0) {
                // Atualizar progresso
                progressBar.style.width = '100%';
                progressBar.textContent = '100%';
                statusText.textContent = 'Processamento concluído!';
                
                // Processar dados
                const novosMembros = results.data.map((row, index) => {
                    let memberData = {};
                    for (const key in fieldMapping) {
                        // Mapeia o cabeçalho do arquivo para o campo do sistema
                        // Se a coluna não existir, o valor será ''
                        memberData[key] = row[key] || '';
                    }
                    
                    // Adicionando a nova lógica para Tem_Filhos
                    const temFilhosValue = row.Tem_Filhos || '';
                    if (temFilhosValue) {
                        memberData.Tem_Filhos = normalizeYesNo(temFilhosValue);
                    } else {
                        // Se o campo Tem_Filhos não existir, tenta inferir
                        const temFilhosInferred = (row.Nm_Mae && row.Nm_Mae.trim() !== '') || (row.Nm_Pai && row.Nm_Pai.trim() !== '');
                        memberData.Tem_Filhos = temFilhosInferred ? 'Sim' : 'Não';
                    }

                    if (memberData.Sexo) memberData.Sexo = normalizeSexo(memberData.Sexo);
                    if (memberData.Membro) memberData.Membro = normalizeYesNo(memberData.Membro);
                    if (memberData.Batizado) memberData.Batizado = normalizeYesNo(memberData.Batizado);

                    // Adiciona o campo de status
                    if(row.Status) {
                        memberData.Status = normalizeStatus(row.Status);
                    } else {
                        memberData.Status = 'Ativo';
                    }

                    // Formatar data se existir
                    if (memberData.Data_Nasc) {
                        memberData.Data_Nasc = formatarData(memberData.Data_Nasc);
                    }
                    
                    // Formatar CPF se existir
                    if (memberData.CPF) {
                        memberData.CPF = formatarCPF(memberData.CPF.toString());
                    }
                    
                    return memberData;
                }).filter(membro => membro.Nm_Membro); // Remove linhas vazias
                
                console.log('Membros processados:', novosMembros);
                
                if (novosMembros.length > 0) {
                    membros = novosMembros;
                    
                    // Salvar no localStorage
                    localStorage.setItem('membrosData', JSON.stringify(membros));
                    
                    // Atualizar a interface
                    updateDashboard();
                    renderMembrosTable();
                    
                    // Mostrar preview
                    showPreview();
                    
                    // Mostrar mensagem de sucesso
                    showSuccessModal('Importação concluída com sucesso! ' + membros.length + ' registros processados.');
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
            
            // Esconder barra de progresso após 2 segundos
            setTimeout(() => {
                statusCard.classList.add('d-none');
            }, 2000);
            
            // Limpar o input
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

// Função para normalizar valores para "Sim" ou "Não"
function normalizeYesNo(value) {
    const lowerValue = String(value).toLowerCase().trim();
    if (lowerValue === 'sim' || lowerValue === 's' || lowerValue === 'true' || lowerValue === 't') {
        return 'Sim';
    }
    if (lowerValue === 'nao' || lowerValue === 'não' || lowerValue === 'n' || lowerValue === 'false' || lowerValue === 'f') {
        return 'Não';
    }
    return 'Não'; // Assume 'Não' se o valor não for reconhecido
}

// Função para normalizar valores de sexo
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

// Função para normalizar valores de status
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
        
        // Mostrar informações de debug na interface
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
    
    // Se já estiver no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return data;
    }
    
    // Se estiver no formato DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
        const partes = data.split('/');
        return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
    }
    
    // Se for uma data válida
    try {
        const dataObj = new Date(data);
        if (!isNaN(dataObj.getTime())) {
            return dataObj.toISOString().split('T')[0];
        }
    } catch (e) {
        console.error('Erro ao formatar data:', e);
    }
    
    return data; // Retorna original se não conseguir formatar
}

function formatarCPF(cpf) {
    if (!cpf) return '';
    
    // Remove caracteres não numéricos
    cpf = cpf.toString().replace(/\D/g, '');
    
    // Formata no padrão 000.000.000-00
    if (cpf.length === 11) {
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    
    return cpf; // Retorna original se não tiver 11 dígitos
}

function clearCSV() {
    document.getElementById('csvFile').value = '';
    document.getElementById('previewTableBody').innerHTML = '';
    document.getElementById('importStatusCard').classList.add('d-none');
    document.getElementById('debugInfo').style.display = 'none';
}

function showPreview() {
    const previewBody = document.getElementById('previewTableBody');
    previewBody.innerHTML = '';
    
    // Mostrar apenas os primeiros 5 registros para preview
    const previewData = membros.slice(0, 5);
    
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
    // Atualizar estatísticas
    document.getElementById('total-membros').textContent = membros.length;
    
    const ativos = membros.filter(m => m.Status === 'Ativo').length;
    document.getElementById('ativos').textContent = ativos;
    
    const batizados = membros.filter(m => m.Batizado === 'Sim').length;
    document.getElementById('batizados').textContent = batizados;
    
    // Calcular aniversariantes do mês atual
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const aniversariantes = membros.filter(m => {
        if (!m.Data_Nasc) return false;
        const dataNasc = new Date(m.Data_Nasc);
        return dataNasc.getMonth() + 1 === mesAtual;
    }).length;
    document.getElementById('aniversariantes').textContent = aniversariantes;
    
    // Atualizar gráficos
    updateCharts();
}

function updateCharts() {
    // Dados para gráfico de status (manter o status para o dashboard)
    const statusCounts = {
        'Ativo': membros.filter(m => m.Status === 'Ativo').length,
        'Inativo': membros.filter(m => m.Status === 'Inativo').length,
        'Falecido': membros.filter(m => m.Status === 'Falecido').length
    };
    
    // Dados para gráfico de sexo
    const sexoCounts = {
        'Masculino': membros.filter(m => m.Sexo === 'Masculino').length,
        'Feminino': membros.filter(m => m.Sexo === 'Feminino').length
    };
    
    // Destruir gráficos existentes se houver
    if (statusChart) {
        statusChart.destroy();
    }
    if (sexoChart) {
        sexoChart.destroy();
    }
    
    // Criar gráfico de status
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
    
    // Criar gráfico de sexo
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
    
    // Aplicar filtros
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const membroFilter = document.getElementById('membroFilter').value;
    
    let filteredMembros = membros.filter(membro => {
        const matchesSearch = membro.Nm_Membro.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === '' || membro.Status === statusFilter;
        const matchesMembro = membroFilter === '' || membro.Membro === membroFilter;
        
        return matchesSearch && matchesStatus && matchesMembro;
    });
    
    // Calcular paginação
    const totalPages = Math.ceil(filteredMembros.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredMembros.length);
    const paginatedMembros = filteredMembros.slice(startIndex, endIndex);
    
    // Preencher tabela
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
    
    // Configurar botões de edição e exclusão
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
    
    // Atualizar paginação
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Botão anterior
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
    
    // Números das páginas (limitar exibidos para não poluir a UI se muitas páginas)
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
    
    // Botão próximo
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
    
    // Preencher o formulário com os dados do membro
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
    
    // Remover classes de validação
    document.getElementById('membroForm').classList.remove('was-validated');
    
    // Abrir o modal
    const modal = new bootstrap.Modal(document.getElementById('adicionarMembroModal'));
    modal.show();
}

function saveMembro() {
    const form = document.getElementById('membroForm');
    
    // Validar formulário
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const memberId = document.getElementById('membroId').value;
    const casdastroValue = document.getElementById('casdastro').value;

    // Verificar se o número de cadastro já existe para novos membros
    if (!memberId && membros.some(m => m.casdastro === casdastroValue)) {
        showErrorModal('Erro: O número de cadastro informado já existe.');
        return;
    }
    
    // Coletar dados do formulário
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
    
    if (memberId) {
        // Editar membro existente
        const index = membros.findIndex(m => m.casdastro === memberId);
        if (index !== -1) {
            membros[index] = { ...membros[index], ...membroData };
        }
    } else {
        // Adicionar novo membro
        membros.push(membroData);
    }
    
    // Salvar no localStorage
    localStorage.setItem('membrosData', JSON.stringify(membros));
    
    // Atualizar a interface
    updateDashboard();
    renderMembrosTable();
    
    // Fechar o modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('adicionarMembroModal'));
    modal.hide();
    
    // Limpar o formulário
    document.getElementById('membroForm').reset();
    document.getElementById('membroId').value = '';
    form.classList.remove('was-validated');
    
    // Mostrar mensagem de sucesso
    showSuccessModal('Registro salvo com sucesso!');
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

function confirmDelete() {
    if (!memberToDelete) return;
    
    // Encontrar e remover o membro
    const index = membros.findIndex(m => m.casdastro === memberToDelete);
    if (index !== -1) {
        membros.splice(index, 1);
        
        // Salvar no localStorage
        localStorage.setItem('membrosData', JSON.stringify(membros));
        
        // Atualizar a interface
        updateDashboard();
        renderMembrosTable();
        
        // Mostrar mensagem de sucesso
        showSuccessModal('Membro excluído com sucesso!');
    }
    
    // Fechar o modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
    modal.hide();
    
    memberToDelete = null;
}

function generateReport() {
    const reportType = document.getElementById('relatorioTipo').value;
    const relatorioHeader = document.getElementById('relatorioHeader');
    const relatorioBody = document.getElementById('relatorioBody');
    
    relatorioHeader.innerHTML = '';
    relatorioBody.innerHTML = '';
    
    let headers = [];
    
    if (reportType === 'aniversariantes') {
        // Pergunta o mês ao usuário
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

        // ordenar aniversariantes pelo dia do mês
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

    // Relatórios tradicionais (nominais)
    let field;
    switch (reportType) {
        case 'status':
            headers = ['Status', 'Quantidade', 'Percentual', 'Nomes'];
            field = 'Status';
            break;
        case 'sexo':
            headers = ['Sexo', 'Quantidade', 'Percentual', 'Nomes'];
            field = 'Sexo';
            break;
        case 'batismo':
            headers = ['Batizado', 'Quantidade', 'Percentual', 'Nomes'];
            field = 'Batizado';
            break;
        case 'estadoCivil':
            headers = ['Estado Civil', 'Quantidade', 'Percentual', 'Nomes'];
            field = 'Estado_Civil';
            break;
        case 'membro':
            headers = ['Tipo de Membro', 'Quantidade', 'Percentual', 'Nomes'];
            field = 'Membro';
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
    
    // Contar ocorrências
    data.forEach(item => {
        const value = item[field] || 'Não informado';
        counts[value] = (counts[value] || 0) + 1;
    });
    
    // Calcular percentuais
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

        // Ordenar por dia do mês antes de exportar
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
        // escapar possíveis aspas no campo nomes
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
            // Substitui quebras de linha e aspas duplas por "aspas duplas"
            let escapedValue = String(value).replace(/"/g, '""').replace(/\r?\n|\r/g, ' ');
            // Envolve o valor em aspas duplas, a menos que seja um número simples
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
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const contents = e.target.result;
            const restoredData = JSON.parse(contents);
            
            if (Array.isArray(restoredData)) {
                membros = restoredData;
                localStorage.setItem('membrosData', JSON.stringify(membros));
                
                updateDashboard();
                renderMembrosTable();
                
                showSuccessModal('Dados restaurados com sucesso!');
            } else {
                showErrorModal('O arquivo não contém dados válidos.');
            }
        } catch (error) {
            console.error('Erro ao restaurar dados:', error);
            showErrorModal('Erro ao restaurar dados. Verifique se o arquivo é válido.');
        }
    };
    reader.readAsText(file);
    
    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    evt.target.value = '';
}
