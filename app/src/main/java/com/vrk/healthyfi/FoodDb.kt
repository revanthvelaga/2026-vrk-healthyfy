package com.vrk.healthyfi

// Approximate values per typical home serving. Add your own via "Custom food".
// FoodItem(name, unit, kcal, protein g, carbs g, fat g)
val FOOD_DB: List<FoodItem> = listOf(
    // South Indian breakfast
    FoodItem("Idli", "1 pc", 39.0, 2.0, 8.0, 0.2),
    FoodItem("Plain dosa", "1 pc", 133.0, 3.9, 18.6, 5.0),
    FoodItem("Masala dosa", "1 pc", 250.0, 5.0, 35.0, 10.0),
    FoodItem("Onion dosa", "1 pc", 180.0, 4.0, 24.0, 7.0),
    FoodItem("Pesarattu", "1 pc", 120.0, 7.0, 17.0, 3.0),
    FoodItem("Uttapam", "1 pc", 220.0, 6.0, 34.0, 7.0),
    FoodItem("Medu vada", "1 pc", 97.0, 3.5, 9.0, 5.5),
    FoodItem("Upma", "1 bowl", 200.0, 5.0, 30.0, 7.0),
    FoodItem("Pongal", "1 bowl", 250.0, 7.0, 35.0, 9.0),
    FoodItem("Poha", "1 bowl", 180.0, 4.0, 33.0, 4.0),
    FoodItem("Puri", "1 pc", 100.0, 1.5, 12.0, 5.0),
    FoodItem("Coconut chutney", "2 tbsp", 70.0, 1.0, 3.0, 6.0),
    FoodItem("Peanut chutney", "2 tbsp", 90.0, 3.5, 3.0, 7.0),
    FoodItem("Ragi java", "1 glass", 120.0, 3.0, 22.0, 2.0),
    FoodItem("Oats (dry)", "40 g", 150.0, 5.0, 27.0, 2.5),

    // Rice & rotis
    FoodItem("White rice (cooked)", "1 cup", 205.0, 4.3, 45.0, 0.4),
    FoodItem("Brown rice (cooked)", "1 cup", 216.0, 5.0, 45.0, 1.8),
    FoodItem("Curd rice", "1 bowl", 230.0, 7.0, 35.0, 6.0),
    FoodItem("Lemon rice", "1 bowl", 250.0, 4.0, 40.0, 8.0),
    FoodItem("Pulihora", "1 bowl", 260.0, 4.5, 42.0, 8.0),
    FoodItem("Veg fried rice", "1 plate", 330.0, 7.0, 52.0, 10.0),
    FoodItem("Chicken biryani", "1 plate", 500.0, 25.0, 55.0, 18.0),
    FoodItem("Veg biryani", "1 plate", 380.0, 9.0, 55.0, 12.0),
    FoodItem("Chapati", "1 pc", 104.0, 3.0, 18.0, 2.5),
    FoodItem("Paratha", "1 pc", 180.0, 4.0, 25.0, 7.0),
    FoodItem("Jowar roti", "1 pc", 110.0, 3.5, 23.0, 1.0),
    FoodItem("Ragi mudde", "1 ball", 230.0, 6.0, 48.0, 1.6),
    FoodItem("Bread slice", "1 slice", 70.0, 2.5, 13.0, 1.0),

    // Dals & curries
    FoodItem("Sambar", "1 bowl", 130.0, 6.0, 18.0, 4.0),
    FoodItem("Rasam", "1 bowl", 60.0, 2.0, 9.0, 2.0),
    FoodItem("Pappu (dal)", "1 bowl", 170.0, 9.0, 22.0, 5.0),
    FoodItem("Dal tadka", "1 bowl", 180.0, 9.0, 24.0, 5.0),
    FoodItem("Rajma", "1 bowl", 210.0, 10.0, 30.0, 5.0),
    FoodItem("Chole", "1 bowl", 240.0, 10.0, 32.0, 8.0),
    FoodItem("Mixed veg curry", "1 bowl", 150.0, 4.0, 15.0, 8.0),
    FoodItem("Bhindi fry", "1 bowl", 140.0, 3.0, 12.0, 9.0),
    FoodItem("Avakaya pickle", "1 tbsp", 40.0, 0.3, 1.0, 4.0),

    // Protein
    FoodItem("Egg (boiled)", "1 egg", 78.0, 6.3, 0.6, 5.3),
    FoodItem("Egg white", "1 egg", 17.0, 3.6, 0.2, 0.1),
    FoodItem("Omelette (2 eggs)", "1 plate", 190.0, 13.0, 1.0, 15.0),
    FoodItem("Egg curry", "1 bowl", 240.0, 14.0, 8.0, 17.0),
    FoodItem("Chicken breast (grilled)", "100 g", 165.0, 31.0, 0.0, 3.6),
    FoodItem("Chicken curry", "1 bowl", 280.0, 26.0, 6.0, 17.0),
    FoodItem("Gongura chicken", "1 bowl", 300.0, 28.0, 6.0, 18.0),
    FoodItem("Tandoori chicken", "2 pcs", 260.0, 32.0, 4.0, 13.0),
    FoodItem("Chicken 65", "1 plate", 350.0, 30.0, 12.0, 20.0),
    FoodItem("Fish curry", "1 bowl", 230.0, 22.0, 6.0, 13.0),
    FoodItem("Fish fry", "1 pc", 200.0, 18.0, 6.0, 11.0),
    FoodItem("Prawn curry", "1 bowl", 220.0, 22.0, 7.0, 11.0),
    FoodItem("Mutton curry", "1 bowl", 350.0, 25.0, 6.0, 25.0),
    FoodItem("Paneer", "100 g", 265.0, 18.0, 1.2, 21.0),
    FoodItem("Paneer butter masala", "1 bowl", 360.0, 14.0, 12.0, 28.0),
    FoodItem("Palak paneer", "1 bowl", 260.0, 13.0, 10.0, 18.0),
    FoodItem("Soya chunks (dry)", "50 g", 172.0, 26.0, 16.0, 0.3),
    FoodItem("Sprouts", "1 bowl", 100.0, 7.0, 17.0, 0.5),
    FoodItem("Whey protein", "1 scoop", 120.0, 24.0, 3.0, 1.5),
    FoodItem("Tofu", "100 g", 76.0, 8.0, 1.9, 4.8),

    // Dairy & drinks
    FoodItem("Milk (toned)", "1 glass", 145.0, 8.0, 12.0, 7.0),
    FoodItem("Curd", "1 cup", 120.0, 7.0, 9.0, 6.6),
    FoodItem("Greek yogurt", "100 g", 97.0, 9.0, 3.6, 5.0),
    FoodItem("Buttermilk", "1 glass", 40.0, 3.0, 5.0, 1.0),
    FoodItem("Tea with milk & sugar", "1 cup", 60.0, 1.5, 10.0, 1.5),
    FoodItem("Filter coffee", "1 cup", 80.0, 2.0, 12.0, 2.5),
    FoodItem("Black coffee", "1 cup", 2.0, 0.3, 0.0, 0.0),
    FoodItem("Coconut water", "1 glass", 45.0, 0.5, 9.0, 0.5),

    // Fruits & nuts
    FoodItem("Banana", "1 medium", 105.0, 1.3, 27.0, 0.4),
    FoodItem("Apple", "1 medium", 95.0, 0.5, 25.0, 0.3),
    FoodItem("Mango", "1 cup", 100.0, 1.4, 25.0, 0.6),
    FoodItem("Guava", "1 medium", 68.0, 2.5, 14.0, 1.0),
    FoodItem("Papaya", "1 cup", 62.0, 0.7, 16.0, 0.4),
    FoodItem("Watermelon", "1 cup", 46.0, 0.9, 11.5, 0.2),
    FoodItem("Almonds", "10 pcs", 70.0, 2.5, 2.5, 6.0),
    FoodItem("Peanuts (roasted)", "30 g", 170.0, 7.7, 4.8, 14.8),
    FoodItem("Peanut butter", "1 tbsp", 95.0, 4.0, 3.0, 8.0),
    FoodItem("Dates", "2 pcs", 133.0, 0.9, 36.0, 0.1),

    // Snacks & sweets
    FoodItem("Samosa", "1 pc", 260.0, 4.0, 24.0, 17.0),
    FoodItem("Mirchi bajji", "1 pc", 120.0, 2.0, 12.0, 7.0),
    FoodItem("Onion pakoda", "1 plate", 300.0, 6.0, 25.0, 20.0),
    FoodItem("Maggi noodles", "1 pack", 350.0, 8.0, 47.0, 14.0),
    FoodItem("Biscuits (Marie)", "4 pcs", 120.0, 2.0, 20.0, 3.5),
    FoodItem("Gulab jamun", "1 pc", 150.0, 2.0, 20.0, 7.0),
    FoodItem("Jalebi", "1 pc", 150.0, 1.0, 25.0, 5.0),
    FoodItem("Laddu", "1 pc", 180.0, 3.0, 24.0, 8.0),
)

val STRENGTH_EXERCISES = listOf(
    "Bench press", "Squat", "Deadlift", "Overhead press", "Barbell row", "Lat pulldown",
    "Pull-up", "Incline dumbbell press", "Leg press", "Romanian deadlift", "Bicep curl",
    "Tricep pushdown", "Lateral raise", "Lunges", "Calf raise", "Push-up", "Plank",
)

val CARDIO_EXERCISES = listOf("Walking", "Running", "Cycling", "Skipping", "Swimming", "Yoga", "Badminton", "Cricket")

/** MET values used to estimate calories burned. */
fun metFor(exercise: String, cardio: Boolean): Double {
    val e = exercise.lowercase()
    return when {
        !cardio -> 5.0
        "run" in e -> 9.8
        "skip" in e || "rope" in e -> 11.0
        "cycl" in e || "bike" in e -> 7.5
        "swim" in e -> 8.0
        "walk" in e -> 3.5
        "yoga" in e -> 3.0
        "badminton" in e -> 5.5
        "cricket" in e -> 5.0
        else -> 6.0
    }
}
