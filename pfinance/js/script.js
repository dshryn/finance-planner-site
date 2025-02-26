document.addEventListener("DOMContentLoaded", function () {
    const transactionForm = document.getElementById("transaction-form");
    const transactionTable = document.getElementById("transaction-table");
    const darkModeToggle = document.getElementById("dark-mode-toggle");

    let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

    function renderTransactions() {
        transactionTable.innerHTML = "";
        transactions.forEach((transaction, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${transaction.amount}</td>
                <td>${transaction.category}</td>
                <td>${transaction.date}</td>
                <td>${transaction.description}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteTransaction(${index})">Delete</button>
                </td>
            `;
            transactionTable.appendChild(row);
        });
        localStorage.setItem("transactions", JSON.stringify(transactions));
    }

    transactionForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const amount = document.getElementById("amount").value;
        const category = document.getElementById("category").value;
        const date = document.getElementById("date").value;
        const description = document.getElementById("description").value;

        transactions.push({ amount, category, date, description });
        renderTransactions();
        transactionForm.reset();
    });

    window.deleteTransaction = function (index) {
        transactions.splice(index, 1);
        renderTransactions();
    };

    if (darkModeToggle) {
        darkModeToggle.addEventListener("click", function () {
            document.body.classList.toggle("dark-mode");
        });
    }

    renderTransactions();
});
