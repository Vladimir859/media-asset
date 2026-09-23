function openModal() {
    document.getElementById('overlay').classList.add('open');
    document.getElementById('name').focus();
  }
  function closeModal() {
    document.getElementById('overlay').classList.remove('open');
    //resetForm();
  }
  function handleOverlayClick(e) {
    if (e.target === document.getElementById('overlay')) closeModal();
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

async function submitForm(){
  const btn = document.getElementById("btn-submit");

  const formData = {
    name: document.getElementById("name").value.trim(),
    inventory_number: document.getElementById("inventory_number").value.trim(),
    description: document.getElementById("description").value.trim(),
    status_id: parseInt(document.getElementById("status_id").value.trim()),
    location_id: parseInt(document.getElementById("location_id").value.trim()),
    user_id: document.getElementById('user_id').value
              ? parseInt(document.getElementById('user_id').value)
              : null
  };

  try{
    const res = await fetch("http://localhost:3000/api/equipment",{
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(formData)
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    closeModal();
    console.log("данные загружены");
    loadEquipment();
}
catch(err){
  console.log(err);
}
}