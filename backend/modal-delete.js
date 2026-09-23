let deletedID = null;

function createModalDel(id){
    deletedID = id
    const modal = document.createElement("div")
    modal.id = "confirmModal";
    modal.className = "modal-delete";

    modal.innerHTML = `
    <div class="modal-delete-content">
        <p>Вы уверены?</p>
        
        <button id="confirmDelete">Да</button>
        <button id="cancelDelete">Нет</button>
    </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("confirmDelete").addEventListener("click", async() =>{
        deleteEquip(deletedID);
        closeDeleteModal();
    })
    document.getElementById("cancelDelete").addEventListener("click", () => {
        console.log("нажатие кнопки НЕТ")
        deletedID = null
        closeDeleteModal();
    })
}




function closeDeleteModal(){
    const modal = document.getElementById("confirmModal");
    if(modal) modal.remove();
}

//Функция удаления единицы оборудования.
async function deleteEquip(id){
    try {
      const res = await fetch(`${API}/equipment/${id}`,{
        method: "DELETE"
      });
      if(!res.ok) throw new Error(`HTTP ${res.status}`)
      console.log("Удалено")
      loadEquipment();
    } catch (error) {
      console.log(error);
    }
  }