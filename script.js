import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const btnNewProduct = document.getElementById("btnNewProduct");
btnNewProduct.addEventListener('click', () => openModal(-1));

const btnCloseModal = document.getElementById('btnCloseModal');
btnCloseModal.addEventListener('click', closeModal);

const btnNewSection = document.getElementById('btnNewSector');
btnNewSection.addEventListener('click', addNewSector)

const firebaseConfig = {
  apiKey: "AIzaSyB83QOBjY0ExpC53-Ku735OVTSJfe-ZUUo",
  authDomain: "deposit-manager-ml.firebaseapp.com",
  projectId: "deposit-manager-ml",
  storageBucket: "deposit-manager-ml.firebasestorage.app",
  messagingSenderId: "917790979579",
  appId: "1:917790979579:web:832d00bb20cad5ab26075e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let productsNodeEdit = [];
let productsNodeDelete = [];
let products = [];
        let sectors = ['Canecas', 'Jarras', 'Copos', 'Pratos', 'Utensílios', 'Decoração', 'Outros'];
        let editingIndex = -1;

        // Carregar dados do localStorage
        function loadData() {
            const savedProducts = localStorage.getItem('stockProducts');
            const savedSectors = localStorage.getItem('stockSectors');
            
            if (savedProducts) {
                products = JSON.parse(savedProducts);
            }
            if (savedSectors) {
                sectors = JSON.parse(savedSectors);
            }
            
            renderProducts();
            updateStats();
            updateFilters();
            updateSectorOptions();
        }

        // Salvar dados no localStorage
        function saveData() {
            localStorage.setItem('stockProducts', JSON.stringify(products));
            localStorage.setItem('stockSectors', JSON.stringify(sectors));
        }

        // Atualizar opções de setores
        function updateSectorOptions() {
            const sectorSelect = document.getElementById('productSector');
            sectorSelect.innerHTML = '<option value="">Selecione ou digite novo setor</option>' +
                sectors.map(sector => `<option value="${sector}">${sector}</option>`).join('');
        }

        // Adicionar novo setor
        function addNewSector() {
            const newSector = prompt('Digite o nome do novo setor:');
            if (newSector && newSector.trim() && !sectors.includes(newSector.trim())) {
                sectors.push(newSector.trim());
                saveData();
                updateSectorOptions();
                updateFilters();
                document.getElementById('productSector').value = newSector.trim();
            }
        }

        // Abrir modal
        function openModal(index = -1) {
            const modal = document.getElementById('productModal');
            const modalTitle = document.getElementById('modalTitle');
            const form = document.getElementById('productForm');
            
            editingIndex = index;
            
            if (index === -1) {
                modalTitle.textContent = 'Adicionar Produto';
                form.reset();
                resetPhotoUpload();
            } else {
                modalTitle.textContent = 'Editar Produto';
                const product = products[index];
                
                document.getElementById('companyName').value = product.company;
                document.getElementById('productName').value = product.name;
                document.getElementById('productSector').value = product.sector;
                document.getElementById('productQuantity').value = product.quantity;
                document.getElementById('productPrice').value = product.price;
                
                showPhotoPreview(product.photo);
            }
            
            modal.style.display = 'block';
        }

        // Fechar modal
        function closeModal() {
            document.getElementById('productModal').style.display = 'none';
        }

        // Reset photo upload
        function resetPhotoUpload() {
            const photoUpload = document.getElementById('photoUpload');
            photoUpload.classList.remove('has-image');
            photoUpload.innerHTML = `
                <div class="upload-text">
                    <img src="./assets/camera.svg" alt="camera icon">
                    <p>Clique para adicionar foto</p>
                    <small>Formatos aceitos: JPG, PNG, GIF</small>
                </div>
            `;
        }

        // Mostrar preview da foto
        function showPhotoPreview(src) {
            const photoUpload = document.getElementById('photoUpload');
            photoUpload.classList.add('has-image');
            photoUpload.innerHTML = `<img src="${src}" alt="Preview" class="photo-preview">`;
        }

        // Preview da foto
        document.getElementById('productPhoto').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    showPhotoPreview(e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });

        // Submissão do formulário
        document.getElementById('productForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const photoFile = document.getElementById('productPhoto').files[0];
            const photoPreview = document.querySelector('.photo-preview');
            
            if (!photoFile && !photoPreview && editingIndex === -1) {
                alert('Por favor, adicione uma foto do produto!');
                return;
            }
            
            const product = {
                id: editingIndex === -1 ? Date.now() : products[editingIndex].id,
                company: document.getElementById('companyName').value,
                name: document.getElementById('productName').value,
                sector: document.getElementById('productSector').value,
                quantity: parseInt(document.getElementById('productQuantity').value),
                price: parseFloat(document.getElementById('productPrice').value),
                photo: photoPreview ? photoPreview.src : null
            };
            
            if (photoFile) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    product.photo = e.target.result;
                    saveProduct(product);
                };
                reader.readAsDataURL(photoFile);
            } else {
                saveProduct(product);
            }
        });

        function saveProduct(product) {
            if (editingIndex === -1) {
                products.push(product);
            } else {
                products[editingIndex] = product;
            }
            
            saveData();
            renderProducts();
            updateStats();
            updateFilters();
            closeModal();
        }

        // Deletar produto
        function deleteProduct(index) {
            if (confirm('Tem certeza que deseja excluir este produto?')) {
                products.splice(index, 1);
                saveData();
                renderProducts();
                updateStats();
                updateFilters();
            }
        }

        // Renderizar produtos
        function renderProducts() {
            const grid = document.getElementById('productsGrid');
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const sectorFilter = document.getElementById('sectorFilter').value;
            const companyFilter = document.getElementById('companyFilter').value;
            
            let filteredProducts = products.filter(product => {
                const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                                    product.company.toLowerCase().includes(searchTerm) ||
                                    product.sector.toLowerCase().includes(searchTerm);
                const matchesSector = !sectorFilter || product.sector === sectorFilter;
                const matchesCompany = !companyFilter || product.company === companyFilter;
                
                return matchesSearch && matchesSector && matchesCompany;
            });
            
            if (filteredProducts.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <h3>Nenhum produto encontrado</h3>
                        <p>Adicione produtos ao seu estoque ou ajuste os filtros de pesquisa.</p>
                        <button class="btn btn-primary" onclick="openModal()">
                            ➕ Adicionar Primeiro Produto
                        </button>
                    </div>
                `;
                return;
            }
            
            grid.innerHTML = filteredProducts.map((product, index) => {
                const originalIndex = products.indexOf(product);
                const stockClass = product.quantity > 50 ? 'stock-high' : 
                                 product.quantity > 20 ? 'stock-medium' : 'stock-low';
                const stockIcon = product.quantity > 50 ? '✅' : 
                                product.quantity > 20 ? '⚠️' : '🔴';
                
                return `
                    <div class="product-card">
                        <img src="${product.photo}" alt="${product.name}" class="product-image">
                        <div class="product-content">
                            <div class="product-header">
                                <div>
                                    <h3 class="product-title">${product.name}</h3>
                                    <span class="product-company">${product.company}</span>
                                </div>
                            </div>
                            
                            <div class="product-details">
                                <div class="product-detail">
                                    <span class="detail-label">Setor</span>
                                    <span class="detail-value">${product.sector || 'Não definido'}</span>
                                </div>
                                <div class="product-detail">
                                    <span class="detail-label">Estoque</span>
                                    <span class="detail-value">${product.quantity} unidades</span>
                                </div>
                            </div>
                            
                            <div class="product-price">R$ ${product.price.toFixed(2)}</div>
                            
                            <div class="product-stock ${stockClass}">
                                ${stockIcon} ${product.quantity > 50 ? 'Estoque Alto' : 
                                              product.quantity > 20 ? 'Estoque Médio' : 'Estoque Baixo'}
                            </div>
                            
                            <div class="product-actions">
                                <button class="btn btn-success btn-sm btn-edit">
                                    <img src="./assets/pencil.svg" alt="Pencil icon">
                                    Editar
                                </button>
                                <button class="btn btn-danger btn-sm btn-delete">
                                    <img src="./assets/trash.svg" alt="Trash icon">
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            productsNodeEdit = document.querySelectorAll('.btn-edit');
            productsNodeEdit.forEach((item, index) => {
                item.addEventListener('click', () => openModal(index));
            });

            productsNodeDelete = document.querySelectorAll('.btn-delete');
            productsNodeDelete.forEach((item, index) => {
                item.addEventListener('click', () => deleteProduct(index));
            });
        }

        // Atualizar estatísticas
        function updateStats() {
            const totalProducts = products.length;
            const totalValue = products.reduce((sum, product) => sum + (product.price * product.quantity), 0);
            const lowStockProducts = products.filter(product => product.quantity <= 20).length;
            const totalQuantity = products.reduce((sum, product) => sum + product.quantity, 0);
            
            document.getElementById('stats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-number">${totalProducts}</div>
                    <div class="stat-label">Produtos Cadastrados</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalQuantity}</div>
                    <div class="stat-label">Itens em Estoque</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">R$ ${totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                    <div class="stat-label">Valor Total</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${lowStockProducts}</div>
                    <div class="stat-label">Alertas de Estoque</div>
                </div>
            `;
        }

        // Atualizar filtros
        function updateFilters() {
            const uniqueSectors = [...new Set(products.map(product => product.sector).filter(s => s))];
            const companies = ['Mega Leve +', 'Leve Mais'];
            
            const sectorFilter = document.getElementById('sectorFilter');
            const companyFilter = document.getElementById('companyFilter');
            
            sectorFilter.innerHTML = '<option value="">Todos os setores</option>' +
                uniqueSectors.map(sector => `<option value="${sector}">${sector}</option>`).join('');
            
            companyFilter.innerHTML = '<option value="">Todas as empresas</option>' +
                companies.map(company => `<option value="${company}">${company}</option>`).join('');
        }

        // Event listeners
        document.getElementById('searchInput').addEventListener('input', renderProducts);
        document.getElementById('sectorFilter').addEventListener('change', renderProducts);
        document.getElementById('companyFilter').addEventListener('change', renderProducts);

        // Fechar modal ao clicar fora
        window.onclick = function(event) {
            const modal = document.getElementById('productModal');
            if (event.target === modal) {
                closeModal();
            }
        }

        // Carregar dados ao iniciar
        loadData();