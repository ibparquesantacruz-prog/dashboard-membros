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
    // Carregar os membros ao iniciar a página
    await fetchMembros();

    // Adicionar listeners para os modais
    document.getElementById('addMemberForm').addEventListener('submit', handleAddMember);
    document.getElementById('editMemberForm').addEventListener('submit', handleEditMember);
    document.getElementById('confirmDeleteBtn').addEventListener('click', handleDeleteMember);
    document.getElementById('importCsvBtn').addEventListener('click', () => document.getElementById('csvFile').click());
    document.getElementById('csvFile').addEventListener('change', handleFileUpload);
    document.getElementById('restoreDbBtn').addEventListener('click', () => document.getElementById('restoreFile').click());
    document.getElementById('restoreFile').addEventListener('change', handleRestoreDb);

    // Adicionar listeners de navegação
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-bs-target');
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active', 'show');
            });
            document.getElementById(targetId).classList.add('active', 'show');

            document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Ativar a primeira seção por padrão
    document.querySelector('.nav-link.active').click();
}

async function fetchMembros() {
    try {
        const response = await fetch('/api/membros');
        if (!response.ok) {
            throw new Error('Erro ao buscar dados da API.');
        }
        membros = await response.json();
        renderTable();
        updateCharts();
        updateDashboardCards();
        showSuccessModal('Dados carregados com sucesso!');
    } catch (error) {
        console.error('Erro ao buscar membros:', error);
        showErrorModal('Erro ao carregar dados. Verifique a conexão com a API.');
    }
}

function renderTable() {
    const tableBody = document.querySelector('#membersTable tbody');
    tableBody.innerHTML = '';

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedMembros = membros.slice(start, end);

    if (paginatedMembros.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum membro encontrado.</td></tr>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    paginatedMembros.forEach(membro => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${membro.casdastro}</td>
            <td>${membro.Nm_Membro || ''}</td>
            <td>${membro.Status || ''}</td>
            <td>${membro.Sexo || ''}</td>
            <td class="text-nowrap">
                <button class="btn btn-sm btn-info view-btn" data-id="${membro.casdastro}"><i class="bi bi-eye"></i></button>
                <button class="btn btn-sm btn-warning edit-btn" data-id="${membro.casdastro}"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${membro.casdastro}"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    setupTableListeners();
    renderPagination();
}

function renderPagination() {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';

    const totalPages = Math.ceil(membros.length / itemsPerPage);

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#">Anterior</a>`;
    prevLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });
    paginationContainer.appendChild(prevLi);

    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${currentPage === i ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener('click', (e) => {
            e.preventDefault();
            currentPage = i;
            renderTable();
        });
        paginationContainer.appendChild(li);
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#">Próximo</a>`;
    nextLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });
    paginationContainer.appendChild(nextLi);
}

function setupTableListeners() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const membro = membros.find(m => m.casdastro.toString() === id);
            if (membro) {
                fillViewModal(membro);
                const viewModal = new bootstrap.Modal(document.getElementById('viewMemberModal'));
                viewModal.show();
            }
        });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const membro = membros.find(m => m.casdastro.toString() === id);
            if (membro) {
                fillEditForm(membro);
                const editModal = new bootstrap.Modal(document.getElementById('editMemberModal'));
                editModal.show();
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            memberToDelete = id;
            const deleteModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
            deleteModal.show();
        });
    });
}

function fillViewModal(membro) {
    document.getElementById('viewCasdastro').textContent = membro.casdastro || '';
    document.getElementById('viewNm_Membro').textContent = membro.Nm_Membro || '';
    document.getElementById('viewStatus').textContent = membro.Status || '';
    document.getElementById('viewTem_Filhos').textContent = membro.Tem_Filhos || '';
    document.getElementById('viewSexo').textContent = membro.Sexo || '';
    document.getElementById('viewMembro').textContent = membro.Membro || '';
    document.getElementById('viewBatizado').textContent = membro.Batizado || '';
    document.getElementById('viewCelular').textContent = membro.Celular || '';
    document.getElementById('viewData_Nasc').textContent = membro.Data_Nasc || '';
    document.getElementById('viewCPF').textContent = membro.CPF || '';
    document.getElementById('viewNaturalidade').textContent = membro.Naturalidade || '';
    document.getElementById('viewEstado_Civil').textContent = membro.Estado_Civil || '';
    document.getElementById('viewEscolaridade').textContent = membro.Escolaridade || '';
    document.getElementById('viewProfissao').textContent = membro.Profissao || '';
    document.getElementById('viewNm_Conjuge').textContent = membro.Nm_Conjuge || '';
    document.getElementById('viewEndereco').textContent = membro.Endereco || '';
    document.getElementById('viewComp_Endereco').textContent = membro.Comp_Endereco || '';
    document.getElementById('viewBairro').textContent = membro.Bairro || '';
    document.getElementById('viewCidade').textContent = membro.Cidade || '';
    document.getElementById('viewCEP').textContent = membro.CEP || '';
    document.getElementById('viewNm_Mae').textContent = membro.Nm_Mae || '';
    document.getElementById('viewNm_Pai').textContent = membro.Nm_Pai || '';
}

function fillEditForm(membro) {
    document.getElementById('editCasdastro').value = membro.casdastro || '';
    document.getElementById('editNm_Membro').value = membro.Nm_Membro || '';
    document.getElementById('editStatus').value = membro.Status || '';
    document.getElementById('editTem_Filhos').value = membro.Tem_Filhos || '';
    document.getElementById('editSexo').value = membro.Sexo || '';
    document.getElementById('editMembro').value = membro.Membro || '';
    document.getElementById('editBatizado').value = membro.Batizado || '';
    document.getElementById('editCelular').value = membro.Celular || '';
    document.getElementById('editData_Nasc').value = membro.Data_Nasc || '';
    document.getElementById('editCPF').value = membro.CPF || '';
    document.getElementById('editNaturalidade').value = membro.Naturalidade || '';
    document.getElementById('editEstado_Civil').value = membro.Estado_Civil || '';
    document.getElementById('editEscolaridade').value = membro.Escolaridade || '';
    document.getElementById('editProfissao').value = membro.Profissao || '';
    document.getElementById('editNm_Conjuge').value = membro.Nm_Conjuge || '';
    document.getElementById('editEndereco').value = membro.Endereco || '';
    document.getElementById('editComp_Endereco').value = membro.Comp_Endereco || '';
    document.getElementById('editBairro').value = membro.Bairro || '';
    document.getElementById('editCidade').value = membro.Cidade || '';
    document.getElementById('editCEP').value = membro.CEP || '';
    document.getElementById('editNm_Mae').value = membro.Nm_Mae || '';
    document.getElementById('editNm_Pai').value = membro.Nm_Pai || '';
}

async function handleAddMember(e) {
    e.preventDefault();

    const form = document.getElementById('addMemberForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const newMember = {};
    const formData = new FormData(form);
    for (let [key, value] of formData.entries()) {
        newMember[key] = value;
    }

    try {
        const response = await fetch('/api/membros', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMember)
        });

        if (response.ok) {
            await fetchMembros();
            form.reset();
            form.classList.remove('was-validated');
            const addModal = bootstrap.Modal.getInstance(document.getElementById('addMemberModal'));
            addModal.hide();
            showSuccessModal('Novo membro adicionado com sucesso!');
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao adicionar membro.');
        }
    } catch (error) {
        console.error('Erro ao adicionar membro:', error);
        showErrorModal(`Erro ao adicionar membro: ${error.message}`);
    }
}

async function handleEditMember(e) {
    e.preventDefault();
    const form = document.getElementById('editMemberForm');
    const memberId = document.getElementById('editCasdastro').value;

    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const updatedMember = { casdastro: memberId };
    const formData = new FormData(form);
    for (let [key, value] of formData.entries()) {
        updatedMember[key] = value;
    }

    try {
        const response = await fetch('/api/membros', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedMember)
        });

        if (response.ok) {
            await fetchMembros();
            const editModal = bootstrap.Modal.getInstance(document.getElementById('editMemberModal'));
            editModal.hide();
            showSuccessModal('Membro atualizado com sucesso!');
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao atualizar membro.');
        }
    } catch (error) {
        console.error('Erro ao atualizar membro:', error);
        showErrorModal(`Erro ao atualizar membro: ${error.message}`);
    }
}

async function handleDeleteMember() {
    if (!memberToDelete) return;

    try {
        const response = await fetch('/api/membros', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ casdastro: memberToDelete })
        });

        if (response.ok) {
            await fetchMembros();
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
            deleteModal.hide();
            showSuccessModal('Membro excluído com sucesso!');
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao excluir membro.');
        }
    } catch (error) {
        console.error('Erro ao excluir membro:', error);
        showErrorModal(`Erro ao excluir membro: ${error.message}`);
    }
}

function handleFileUpload(evt) {
    const file = evt.target.files[0];
    if (!file) return;

    // Usar PapaParse para processar o arquivo CSV
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        delimiter: ';', // O problema estava aqui! O arquivo usa ; e não ,
        skipEmptyLines: true,
        complete: function(results) {
            const data = results.data;
            if (data.length > 0) {
                // Mapear os dados do CSV para o formato da API, se necessário
                const membrosImport = data.map(row => {
                    const newMember = {};
                    for (const csvField in fieldMapping) {
                        const dbField = fieldMapping[csvField];
                        newMember[dbField] = row[csvField] || null;
                    }
                    return newMember;
                });

                // Enviar os dados para a API
                fetch('/api/membros-bulk', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(membrosImport)
                }).then(response => {
                    if (response.ok) {
                        return fetchMembros();
                    } else {
                        throw new Error('Erro ao importar dados via API.');
                    }
                }).then(() => {
                    showSuccessModal('Dados importados com sucesso!');
                }).catch(error => {
                    console.error('Erro ao importar dados:', error);
                    showErrorModal('Erro ao importar dados. Verifique se o arquivo e a API são válidos.');
                });
            } else {
                showErrorModal('O arquivo CSV está vazio ou o formato é inválido.');
            }
        },
        error: function(err, file, inputElem, reason) {
            console.error('Erro no PapaParse:', err);
            showErrorModal(`Erro ao processar o arquivo CSV: ${reason}`);
        }
    });

    evt.target.value = ''; // Limpar o input para permitir o upload do mesmo arquivo novamente
}

function handleRestoreDb(evt) {
    const file = evt.target.files[0];
    if (!file) return;

    // Ler o arquivo JSON
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

function updateCharts() {
    const statusData = {};
    const sexoData = {};

    membros.forEach(membro => {
        const status = membro.Status || 'Não Informado';
        const sexo = membro.Sexo || 'Não Informado';

        statusData[status] = (statusData[status] || 0) + 1;
        sexoData[sexo] = (sexoData[sexo] || 0) + 1;
    });

    const statusCanvas = document.getElementById('statusChart');
    const sexoCanvas = document.getElementById('sexoChart');

    if (statusChart) statusChart.destroy();
    if (sexoChart) sexoChart.destroy();

    const chartColors = {
        Status: {
            'Ativo': '#1cc88a', 'Inativo': '#e74a3b', 'Não Informado': '#858796',
            'Desligado': '#f6c23e', 'Ausente': '#36b9cc'
        },
        Sexo: {
            'Masculino': '#4e73df', 'Feminino': '#f6c23e', 'Não Informado': '#858796'
        }
    };

    statusChart = new Chart(statusCanvas, {
        type: 'pie',
        data: {
            labels: Object.keys(statusData),
            datasets: [{
                data: Object.values(statusData),
                backgroundColor: Object.keys(statusData).map(key => chartColors.Status[key] || '#cccccc')
            }]
        }
    });

    sexoChart = new Chart(sexoCanvas, {
        type: 'doughnut',
        data: {
            labels: Object.keys(sexoData),
            datasets: [{
                data: Object.values(sexoData),
                backgroundColor: Object.keys(sexoData).map(key => chartColors.Sexo[key] || '#cccccc')
            }]
        }
    });
}

function updateDashboardCards() {
    const totalMembers = membros.length;
    const activeMembers = membros.filter(m => m.Status === 'Ativo').length;
    const inactiveMembers = membros.filter(m => m.Status === 'Inativo' || m.Status === 'Desligado' || m.Status === 'Ausente').length;
    const maleMembers = membros.filter(m => m.Sexo && m.Sexo.toLowerCase() === 'masculino').length;
    const femaleMembers = membros.filter(m => m.Sexo && m.Sexo.toLowerCase() === 'feminino').length;

    document.getElementById('totalMembersCard').querySelector('.card-body h5').textContent = totalMembers;
    document.getElementById('activeMembersCard').querySelector('.card-body h5').textContent = activeMembers;
    document.getElementById('inactiveMembersCard').querySelector('.card-body h5').textContent = inactiveMembers;
    document.getElementById('maleMembersCard').querySelector('.card-body h5').textContent = maleMembers;
    document.getElementById('femaleMembersCard').querySelector('.card-body h5').textContent = femaleMembers;

    const progressBar = document.getElementById('activeMembersProgressBar');
    if (totalMembers > 0) {
        const percentage = (activeMembers / totalMembers) * 100;
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage.toFixed(2));
        progressBar.textContent = `${percentage.toFixed(0)}%`;
    } else {
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', 0);
        progressBar.textContent = '0%';
    }
}

function showSuccessModal(message) {
    document.getElementById('successMessage').textContent = message;
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
    successModal.show();
}

function showErrorModal(message) {
    document.getElementById('errorMessage').textContent = message;
    const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
    errorModal.show();
}
