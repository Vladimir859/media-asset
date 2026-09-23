const API = 'http://localhost:3000/api';

let allData = [];
let filtered = [];
let users = [];
let sortCol = 'name';
let sortDir = 1;

async function loadEquipment() {
  try {
    const res = await fetch(`${API}/equipment`);
    const data = await res.json();

    allData = data;
    console.log(data)
    applyFilters();
    updateStats();
  } catch (e) {
    document.getElementById('errorBanner').textContent = 'Ошибка подключения';
  }
}

async function loadUsers(){
  try{
    const res = await fetch(`${API}/user`);
    const usersData = await res.json();

    userMap = {}
    usersData.forEach(u => {  
      userMap[u.user_id] = u.full_name;
    });

    console.log(userMap)
  }catch(e){
    document.getElementById("errorBanner").textContent = "Ошибка подключения к бд users"
  }
}

/*function loadDemoData() {
  allData = [
    { equipment_id:1, name:'Laptop', inventory_number:'INV001', status:'available' },
    { equipment_id:2, name:'Projector', inventory_number:'INV002', status:'in_use' }
  ];
  applyFilters();
}*/

function applyFilters() {
  const q = document.getElementById('searchInput').value.toLowerCase();

  filtered = allData.filter(e =>
    e.name.toLowerCase().includes(q)
  );

  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('tableBody');

  tbody.innerHTML = filtered.map(e => `
    <tr>
      <td>${e.name}</td>
      <td>${e.inventory_number}</td>
      <td>${statusLabel(e.status_id)}</td>
      <td>${e.location_id}</td>
      <td>${userMap[e.user_id]}</td>
      <td><button onclick="createModalDel(${e.equipment_id})">delete</button></td>
    </tr>
  `).join('');
}

function statusLabel(val){
    const statusData = {1: "Доступно", 2: "Используется", 3: "Обслуживание", 4:"Ремонт"}
    return statusData[val] || "Неизвестно"
}

function updateStats() {
  document.getElementById('statTotal').textContent = allData.length;
  document.getElementById("statAvailable").textContent = allData.filter(e => e.status_id === 1).length
  document.getElementById("statInUse").textContent = allData.filter(e => e.status_id === 2).length
  document.getElementById("statMaintenance").textContent = allData.filter(e => e.status_id === 3).length

}

function sortBy(col) {
  sortCol = col;
  applyFilters();
}




document.getElementById('searchInput').addEventListener('input', applyFilters);

loadUsers();
loadEquipment();
