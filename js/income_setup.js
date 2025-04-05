document.getElementById("incomeSetupForm").addEventListener("submit", function (event) {
    event.preventDefault(); 

    console.log("Form submitted!");

    let monthlyIncome = parseFloat(document.getElementById("monthlyIncome").value) || 0;
    let foodLimit = parseFloat(document.getElementById("foodLimit").value) || 0;
    let travelLimit = parseFloat(document.getElementById("travelLimit").value) || 0;
    let rentLimit = parseFloat(document.getElementById("rentLimit").value) || 0;
    let shoppingLimit = parseFloat(document.getElementById("shoppingLimit").value) || 0;
    let carLimit = parseFloat(document.getElementById("carLimit").value) || 0;
    let otherLimit = parseFloat(document.getElementById("otherLimit").value) || 0;

    let totalExpenses = foodLimit + travelLimit + rentLimit + shoppingLimit + carLimit + otherLimit;

    if (totalExpenses > monthlyIncome) {
        document.getElementById("errorMsg").style.display = "block";
        return;
    } else {
        document.getElementById("errorMsg").style.display = "none";
    }

    let budgetData = {
        monthlyIncome: monthlyIncome,
        foodLimit: foodLimit,
        travelLimit: travelLimit,
        rentLimit: rentLimit,
        shoppingLimit: shoppingLimit,
        carLimit: carLimit,
        otherLimit: otherLimit
    };

    localStorage.setItem("budgetData", JSON.stringify(budgetData));

    console.log("Redirecting to index.html..."); // 
    setTimeout(() => {
        window.location.href = "./index.html"; 
    }, 1000);
});
