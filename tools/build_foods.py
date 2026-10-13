"""Generates web/js/foods.js.

Each food: name, category, per-100 g [kcal, protein, carbs, fat, fibre], serving units (label, grams),
optional aliases (Telugu/Hindi names) and pairings ("goes well with").
Values are typical home-style estimates based on IFCT 2017 / USDA, rounded.
"""
import json, re, pathlib

K, B, P, G, T, CUP, GL = "katori", "bowl", "piece", "g", "tbsp", "cup", "glass"
KAT, BOWL, GLASS = (K, 150), (B, 250), (GL, 250)

foods = []
def f(name, cat, per, units, pair=(), alias=(), icon=None):
    foods.append(dict(name=name, cat=cat, per=per, units=units, pair=list(pair), alias=list(alias), icon=icon))

SIB = "South Indian breakfast"
f("Idli", SIB, [130, 4.5, 27, 0.6, 1.5], [(P, 40), ("mini idli", 12)], ["Sambar", "Coconut chutney", "Peanut chutney", "Tomato chutney", "Gunpowder podi", "Ghee", "Medu vada", "Filter coffee"], ["iddli"])
f("Plain dosa", SIB, [168, 3.9, 26, 5.5, 1.2], [(P, 80)], ["Sambar", "Coconut chutney", "Tomato chutney", "Peanut chutney", "Ghee", "Filter coffee"], ["dosai", "dosa"])
f("Masala dosa", SIB, [175, 3.6, 25, 6.8, 2], [(P, 180)], ["Sambar", "Coconut chutney", "Tomato chutney", "Filter coffee"])
f("Onion dosa", SIB, [165, 3.8, 24, 6, 1.6], [(P, 100)], ["Sambar", "Coconut chutney", "Tomato chutney"])
f("Ghee roast dosa", SIB, [230, 3.8, 26, 12, 1.2], [(P, 110)], ["Sambar", "Coconut chutney"])
f("Rava dosa", SIB, [190, 3.5, 26, 8, 1], [(P, 90)], ["Sambar", "Coconut chutney"])
f("Set dosa", SIB, [160, 4, 26, 4.5, 1.5], [(P, 60)], ["Coconut chutney", "Sambar"])
f("Pesarattu", SIB, [150, 8, 20, 4.5, 4], [(P, 90)], ["Ginger chutney", "Upma", "Coconut chutney"], ["moong dosa", "green gram dosa"])
f("Uttapam", SIB, [150, 4, 24, 4.5, 1.8], [(P, 140)], ["Sambar", "Coconut chutney", "Tomato chutney"])
f("Medu vada", SIB, [290, 10, 28, 15, 4], [(P, 40)], ["Sambar", "Coconut chutney"], ["garelu", "vada"])
f("Masala vada", SIB, [300, 11, 30, 16, 6], [(P, 35)], ["Coconut chutney", "Tea with milk & sugar"], ["paruppu vada", "dal vada"])
f("Upma", SIB, [140, 3.5, 20, 5.5, 1.5], [KAT, BOWL], ["Coconut chutney", "Pesarattu", "Sambar"], ["rava upma"])
f("Pongal", SIB, [150, 4.5, 21, 5.5, 1.2], [KAT, BOWL], ["Sambar", "Coconut chutney", "Medu vada"], ["ven pongal", "khara pongal"])
f("Poha", SIB, [130, 2.6, 24, 3, 1.2], [KAT, BOWL], ["Tea with milk & sugar", "Curd"], ["atukulu", "aval"])
f("Puri", SIB, [330, 6, 40, 16, 2.5], [(P, 30)], ["Aloo sabzi", "Chole", "Potato kurma"], ["poori"])
f("Appam", SIB, [120, 2.2, 22, 2.5, 0.8], [(P, 60)], ["Vegetable stew", "Egg curry"])
f("Idiyappam", SIB, [140, 2.6, 30, 0.5, 1], [(P, 40)], ["Vegetable stew", "Egg curry", "Coconut milk"], ["string hoppers"])
f("Puttu", SIB, [160, 3, 34, 1.3, 2], [(P, 100)], ["Kadala curry", "Banana"])
f("Semiya upma", SIB, [150, 3.5, 24, 4.5, 1], [KAT], ["Coconut chutney"], ["vermicelli upma"])
f("Rava kesari", SIB, [300, 3, 45, 12, 0.5], [(K, 100)], [], ["kesari bath", "sheera"])
f("Punugulu", SIB, [280, 7, 30, 14, 3], [(P, 15)], ["Coconut chutney", "Ginger chutney"])
f("Mysore bonda", SIB, [280, 6, 30, 15, 1.5], [(P, 35)], ["Coconut chutney"])
f("Mirchi bajji", SIB, [220, 4, 22, 13, 3], [(P, 55)], ["Tea with milk & sugar"])
f("Ragi java", SIB, [60, 1.5, 12, 0.6, 1.2], [GLASS], [], ["ragi malt", "ragi ambali"])
f("Ragi dosa", SIB, [150, 4, 25, 3.5, 3.5], [(P, 80)], ["Coconut chutney", "Sambar"])
f("Oats idli", SIB, [120, 5, 21, 2, 3], [(P, 40)], ["Sambar", "Coconut chutney"])

NIB = "North Indian breakfast"
f("Aloo paratha", NIB, [210, 5, 30, 8, 3], [(P, 120)], ["Curd", "Butter", "Mango pickle", "Tea with milk & sugar"])
f("Paneer paratha", NIB, [230, 9, 27, 10, 3], [(P, 120)], ["Curd", "Mango pickle"])
f("Gobi paratha", NIB, [200, 5, 29, 7.5, 3.5], [(P, 120)], ["Curd", "Butter"])
f("Besan chilla", NIB, [190, 9, 22, 7, 4], [(P, 60)], ["Mint chutney", "Curd"])
f("Moong dal chilla", NIB, [160, 10, 20, 4.5, 4], [(P, 70)], ["Mint chutney", "Curd"])
f("Dhokla", NIB, [160, 6, 23, 5, 2], [(P, 30)], ["Mint chutney"], ["khaman"])
f("Sabudana khichdi", NIB, [200, 2, 32, 7, 1], [KAT], ["Curd"])
f("Thepla", NIB, [280, 8, 40, 10, 6], [(P, 40)], ["Curd", "Mango pickle"])
f("Chole bhature", NIB, [300, 8, 38, 13, 5], [("plate", 300)], ["Onion salad", "Sweet lassi"])

BR = "Rotis & breads"
f("Chapati", BR, [264, 8.5, 48, 4, 7], [(P, 40)], ["Dal tadka", "Paneer butter masala", "Aloo sabzi", "Chicken curry", "Curd", "Mixed veg curry"], ["roti", "chapathi"])
f("Phulka", BR, [260, 8.5, 50, 2.5, 7], [(P, 30)], ["Dal tadka", "Bhindi fry", "Curd"])
f("Plain paratha", BR, [300, 7, 42, 11, 4], [(P, 80)], ["Curd", "Aloo sabzi", "Mango pickle"])
f("Butter naan", BR, [320, 9, 50, 10, 2], [(P, 100)], ["Butter chicken", "Paneer butter masala", "Dal makhani"])
f("Naan", BR, [290, 9, 50, 6, 2], [(P, 90)], ["Butter chicken", "Paneer butter masala", "Dal makhani"])
f("Tandoori roti", BR, [260, 9, 52, 2, 6], [(P, 60)], ["Dal makhani", "Kadai paneer", "Butter chicken"])
f("Kulcha", BR, [290, 8, 50, 6, 2], [(P, 80)], ["Chole"])
f("Bhatura", BR, [330, 7, 45, 14, 2], [(P, 80)], ["Chole"])
f("Jowar roti", BR, [220, 6.5, 46, 1.5, 5], [(P, 50)], ["Dal tadka", "Brinjal curry"], ["jonna rotte", "bhakri"])
f("Bajra roti", BR, [240, 6.5, 46, 3.5, 6], [(P, 50)], ["Dal tadka"])
f("Makki roti", BR, [260, 5.5, 45, 7, 6], [(P, 60)], ["Sarson ka saag"])
f("Missi roti", BR, [260, 10, 42, 6, 7], [(P, 50)], ["Curd"])
f("Ragi mudde", BR, [115, 2.7, 25, 0.5, 3], [("ball", 200)], ["Chicken curry", "Sambar", "Pappu (dal)"], ["ragi sangati", "ragi ball"])
f("White bread", BR, [265, 9, 49, 3.2, 2.7], [("slice", 25)], ["Butter", "Peanut butter", "Omelette", "Jam"])
f("Brown bread", BR, [247, 13, 41, 3.4, 7], [("slice", 28)], ["Peanut butter", "Omelette", "Boiled egg"])
f("Pav", BR, [280, 9, 50, 4, 2.5], [(P, 40)], ["Pav bhaji", "Butter"])
f("Rusk", BR, [410, 11, 73, 8, 3], [(P, 12)], ["Tea with milk & sugar"])

RC = "Rice"
f("White rice", RC, [130, 2.7, 28, 0.3, 0.4], [KAT, (CUP, 160), ("plate", 250)], ["Sambar", "Pappu (dal)", "Rasam", "Curd", "Chicken curry", "Fish curry", "Ghee", "Mango pickle", "Papad", "Bhindi fry"], ["annam", "chawal", "rice"])
f("Brown rice", RC, [123, 2.7, 26, 1, 1.8], [KAT, (CUP, 160)], ["Dal tadka", "Chicken curry", "Curd"])
f("Curd rice", RC, [115, 3.5, 17, 3.5, 0.4], [KAT, BOWL], ["Mango pickle", "Papad"], ["thayir sadam", "daddojanam", "perugu annam"])
f("Lemon rice", RC, [165, 3, 29, 4.5, 1], [KAT, BOWL], ["Papad", "Curd"], ["chitrannam"])
f("Pulihora", RC, [170, 3, 30, 4.5, 1.2], [KAT, BOWL], ["Curd", "Papad"], ["tamarind rice", "puliyogare"])
f("Coconut rice", RC, [190, 3, 28, 7, 2], [KAT], ["Papad"])
f("Tomato rice", RC, [160, 3, 27, 4.5, 1.2], [KAT], ["Raita", "Papad"])
f("Ghee rice", RC, [200, 3, 28, 8, 0.5], [KAT], ["Chicken curry", "Mutton curry"])
f("Jeera rice", RC, [160, 3, 28, 4, 0.6], [KAT], ["Dal tadka", "Dal makhani", "Raita"])
f("Veg pulao", RC, [150, 3.2, 25, 4, 1.5], [KAT, ("plate", 250)], ["Raita", "Potato kurma"])
f("Khichdi", RC, [120, 4.5, 19, 3, 2], [KAT, BOWL], ["Curd", "Papad", "Ghee", "Mango pickle"])
f("Bisi bele bath", RC, [145, 4.5, 22, 4.5, 2.5], [KAT, BOWL], ["Boondi raita", "Papad"])
f("Chicken biryani", RC, [180, 9, 22, 6.5, 1], [("plate", 350), (KAT[0], 150)], ["Raita", "Mirchi ka salan", "Boiled egg", "Onion salad"])
f("Mutton biryani", RC, [200, 10, 21, 8.5, 1], [("plate", 350), (KAT[0], 150)], ["Raita", "Mirchi ka salan", "Onion salad"])
f("Veg biryani", RC, [155, 3.5, 25, 4.8, 2], [("plate", 300), (KAT[0], 150)], ["Raita", "Mirchi ka salan"])
f("Egg biryani", RC, [170, 7, 23, 6, 1], [("plate", 330)], ["Raita", "Mirchi ka salan"])
f("Veg fried rice", RC, [165, 3.5, 28, 4.5, 1.2], [("plate", 300), KAT], ["Gobi manchurian", "Chilli chicken"])
f("Chicken fried rice", RC, [180, 8, 24, 6, 1], [("plate", 300)], ["Chilli chicken"])

DL = "Dals"
f("Pappu (dal)", DL, [110, 6.5, 15, 2.5, 3], [KAT, BOWL], ["White rice", "Ghee", "Mango pickle", "Papad"], ["toor dal", "kandi pappu", "dal"])
f("Tomato pappu", DL, [95, 5, 12, 3, 2.5], [KAT], ["White rice", "Ghee"], ["tomato dal"])
f("Palakura pappu", DL, [95, 5.5, 11, 3, 3], [KAT], ["White rice", "Ghee"], ["spinach dal", "dal palak"])
f("Dal tadka", DL, [120, 6.5, 15, 4, 3], [KAT, BOWL], ["Jeera rice", "Chapati", "White rice"], ["dal fry"])
f("Dal makhani", DL, [140, 6, 13, 7, 4], [KAT], ["Butter naan", "Jeera rice"])
f("Moong dal", DL, [105, 7, 14, 2.5, 3], [KAT], ["Chapati", "White rice"], ["pesara pappu"])
f("Chana dal", DL, [130, 7.5, 17, 3.5, 4], [KAT], ["Chapati", "White rice"])
f("Masoor dal", DL, [110, 7, 15, 2.5, 3], [KAT], ["White rice", "Chapati"])
f("Sambar", DL, [65, 3.2, 9, 2, 2.2], [KAT, BOWL], ["Idli", "Plain dosa", "White rice", "Medu vada"], ["sambhar", "pulusu"])
f("Rasam", DL, [35, 1, 5, 1.3, 0.6], [KAT, BOWL], ["White rice", "Papad"], ["charu", "saaru"])
f("Rajma", DL, [125, 6.5, 17, 3.5, 5], [KAT], ["White rice", "Jeera rice", "Onion salad"], ["rajma masala"])
f("Chole", DL, [150, 7, 20, 5, 6], [KAT], ["Bhatura", "Puri", "Kulcha", "White rice"], ["chana masala", "chickpea curry"])
f("Kadala curry", DL, [140, 7, 17, 5, 5.5], [KAT], ["Puttu", "Appam"])
f("Kadhi", DL, [90, 3, 8, 5, 1], [KAT], ["White rice", "Khichdi"])
f("Mudda pappu", DL, [115, 7, 16, 2.5, 3], [KAT], ["White rice", "Ghee", "Mango pickle"])

VG = "Veg curries"
f("Aloo sabzi", VG, [110, 2, 15, 5, 2], [KAT], ["Puri", "Chapati"], ["potato curry", "aloo curry"])
f("Aloo gobi", VG, [95, 2.5, 11, 5, 2.5], [KAT], ["Chapati", "Phulka"])
f("Bhindi fry", VG, [120, 2.5, 9, 8.5, 3.5], [KAT], ["Chapati", "White rice", "Pappu (dal)"], ["bendakaya fry", "okra fry", "vendakkai"])
f("Brinjal curry", VG, [105, 2, 9, 7, 3.5], [KAT], ["White rice", "Chapati"], ["vankaya curry", "baingan"])
f("Gutti vankaya", VG, [140, 3, 10, 10, 4], [KAT], ["White rice", "Jowar roti"], ["stuffed brinjal"])
f("Beans poriyal", VG, [90, 2.5, 8, 5.5, 3], [KAT], ["White rice", "Sambar"], ["beans fry", "beans thoran"])
f("Cabbage poriyal", VG, [80, 2, 8, 4.5, 2.5], [KAT], ["White rice", "Rasam"], ["cabbage fry"])
f("Dondakaya fry", VG, [120, 2, 10, 8, 3.5], [KAT], ["White rice", "Pappu (dal)"], ["tindora", "ivy gourd"])
f("Sorakaya curry", VG, [60, 1.5, 6, 3.5, 1.5], [KAT], ["White rice", "Chapati"], ["lauki", "bottle gourd"])
f("Mixed veg curry", VG, [100, 2.5, 10, 6, 3], [KAT], ["Chapati", "White rice"])
f("Potato kurma", VG, [130, 2.5, 13, 8, 2], [KAT], ["Puri", "Chapati", "Veg pulao"])
f("Vegetable stew", VG, [95, 2, 9, 6, 2.5], [KAT], ["Appam", "Idiyappam"])
f("Avial", VG, [110, 2.5, 8, 8, 3], [KAT], ["White rice", "Sambar"])
f("Palak paneer", VG, [150, 7, 6, 11, 2], [KAT], ["Chapati", "Jeera rice", "Butter naan"])
f("Paneer butter masala", VG, [220, 8, 9, 17, 1.5], [KAT], ["Butter naan", "Chapati", "Jeera rice"])
f("Kadai paneer", VG, [190, 9, 8, 14, 2], [KAT], ["Tandoori roti", "Chapati"])
f("Matar paneer", VG, [170, 8, 10, 11, 3], [KAT], ["Chapati", "Jeera rice"])
f("Paneer bhurji", VG, [230, 13, 6, 17, 1], [KAT], ["Chapati", "Pav"])
f("Malai kofta", VG, [230, 6, 14, 17, 2], [KAT], ["Butter naan", "Jeera rice"])
f("Dum aloo", VG, [140, 2, 15, 8, 2], [KAT], ["Puri", "Chapati"])
f("Mushroom masala", VG, [110, 3.5, 7, 8, 2], [KAT], ["Chapati"])
f("Sarson ka saag", VG, [110, 3.5, 8, 7.5, 4], [KAT], ["Makki roti", "Butter"])
f("Gobi manchurian", VG, [210, 4, 22, 12, 2.5], [("plate", 200)], ["Veg fried rice"])
f("Mirchi ka salan", VG, [150, 2.5, 10, 11, 3], [KAT], ["Chicken biryani", "Veg biryani"])

NV = "Chicken, mutton & fish"
f("Chicken curry", NV, [150, 15, 4, 8.5, 0.8], [KAT, BOWL], ["White rice", "Chapati", "Ragi mudde", "Ghee rice"], ["kodi kura", "chicken gravy"])
f("Butter chicken", NV, [210, 14, 6, 15, 1], [KAT], ["Butter naan", "Jeera rice"])
f("Gongura chicken", NV, [160, 15, 4, 9.5, 1.5], [KAT], ["White rice", "Chapati"])
f("Andhra chicken fry", NV, [240, 22, 5, 15, 1], [KAT], ["White rice", "Rasam"], ["kodi vepudu"])
f("Chicken 65", NV, [260, 20, 10, 16, 0.5], [("plate", 150)], ["Onion salad"])
f("Chilli chicken", NV, [230, 17, 10, 13, 1], [("plate", 200)], ["Veg fried rice", "Chicken fried rice"])
f("Tandoori chicken", NV, [165, 25, 3, 6, 0.5], [(P, 100), ("half", 300)], ["Mint chutney", "Onion salad"])
f("Chicken tikka", NV, [150, 24, 3, 5, 0.5], [(P, 25)], ["Mint chutney"])
f("Grilled chicken breast", NV, [165, 31, 0, 3.6, 0], [(G, 100), (P, 170)], ["Green salad", "Brown rice"])
f("Chicken keema", NV, [200, 17, 4, 13, 1], [KAT], ["Chapati", "Pav"])
f("Mutton curry", NV, [200, 16, 4, 13.5, 1], [KAT], ["White rice", "Ghee rice", "Chapati"], ["mamsam kura", "gosht"])
f("Mutton keema", NV, [230, 17, 4, 16, 1], [KAT], ["Pav", "Chapati"])
f("Fish curry", NV, [130, 14, 4, 6.5, 0.8], [KAT], ["White rice"], ["chepala pulusu", "meen curry"])
f("Fish fry", NV, [220, 20, 8, 12, 0.5], [(P, 80)], ["White rice", "Rasam"], ["chepa vepudu"])
f("Prawn curry", NV, [140, 15, 5, 7, 1], [KAT], ["White rice"], ["royyala kura"])
f("Prawn fry", NV, [210, 20, 6, 11.5, 0.5], [KAT], ["White rice", "Rasam"])

EG = "Eggs"
f("Boiled egg", EG, [155, 12.6, 1.1, 10.6, 0], [(P, 50)], ["Brown bread", "Tea with milk & sugar"], ["egg"])
f("Egg white", EG, [52, 11, 0.7, 0.2, 0], [(P, 33)], ["Brown bread"])
f("Omelette", EG, [154, 11, 1, 12, 0], [("1-egg", 60), ("2-egg", 120)], ["Brown bread", "White bread", "Tea with milk & sugar"])
f("Egg bhurji", EG, [180, 11.5, 3, 13.5, 0.5], [(K, 100)], ["Chapati", "Pav", "Brown bread"])
f("Fried egg", EG, [196, 13.6, 0.8, 15, 0], [(P, 46)], ["White bread"], ["bullseye", "sunny side up"])
f("Egg curry", EG, [150, 8.5, 5, 10.5, 1], [KAT], ["White rice", "Chapati", "Appam"], ["guddu kura"])

DY = "Milk, curd & paneer"
f("Milk (toned)", DY, [58, 3.1, 4.7, 3, 0], [GLASS, (CUP, 150)], ["Oats", "Banana"], ["milk", "paalu", "doodh"])
f("Whole milk", DY, [67, 3.2, 4.8, 4, 0], [GLASS, (CUP, 150)])
f("Skimmed milk", DY, [35, 3.4, 5, 0.1, 0], [GLASS])
f("Curd", DY, [60, 3.1, 4.5, 3.3, 0], [KAT, (CUP, 200)], ["White rice", "Aloo paratha"], ["perugu", "dahi", "yogurt"])
f("Greek yogurt", DY, [97, 9, 3.6, 5, 0], [(CUP, 170), (G, 100)], ["Banana", "Honey", "Almonds"])
f("Raita", DY, [70, 3, 5, 4, 0.6], [(K, 100)], ["Chicken biryani", "Veg pulao"])
f("Boondi raita", DY, [110, 3.5, 9, 6.5, 0.5], [(K, 100)], ["Bisi bele bath"])
f("Paneer", DY, [265, 18.3, 1.2, 20.8, 0], [(G, 100), ("cube", 20)], [], ["cottage cheese"])
f("Cheese slice", DY, [300, 18, 3, 24, 0], [("slice", 18)])
f("Buttermilk", DY, [15, 0.8, 1.9, 0.5, 0], [GLASS], ["Curd rice", "White rice"], ["majjiga", "chaas", "mor"])
f("Sweet lassi", DY, [75, 2.5, 12, 2, 0], [GLASS])
f("Mango lassi", DY, [100, 2.5, 17, 2.5, 0.3], [GLASS])

BV = "Drinks"
f("Tea with milk & sugar", BV, [37, 1, 6, 1, 0], [(CUP, 150)], ["Marie biscuits", "Rusk", "Samosa"], ["chai", "tea"])
f("Filter coffee", BV, [45, 1.3, 6.5, 1.5, 0], [(CUP, 150)], ["Idli", "Plain dosa"], ["coffee", "kaapi"])
f("Black coffee", BV, [2, 0.3, 0, 0, 0], [(CUP, 150)])
f("Green tea", BV, [1, 0, 0.2, 0, 0], [(CUP, 200)])
f("Coconut water", BV, [19, 0.7, 3.7, 0.2, 1.1], [GLASS], [], ["kobbari neellu", "tender coconut"])
f("Badam milk", BV, [110, 4, 14, 4.5, 0.5], [GLASS])
f("Fresh lime soda", BV, [40, 0, 10, 0, 0], [GLASS], [], ["nimbu soda"])
f("Sugarcane juice", BV, [70, 0.2, 17, 0, 0], [GLASS])
f("Orange juice", BV, [45, 0.7, 10, 0.2, 0.2], [GLASS])
f("Cola", BV, [42, 0, 10.6, 0, 0], [("can", 330), GLASS])
f("Whey protein", BV, [400, 78, 8, 5, 0], [("scoop", 30)], ["Banana", "Milk (toned)", "Oats"], ["protein shake"])
f("Coconut milk", BV, [230, 2.3, 6, 24, 2.2], [(T, 15), (CUP, 240)])

FR = "Fruits"
f("Banana", FR, [89, 1.1, 23, 0.3, 2.6], [(P, 120), ("small", 90)], ["Peanut butter", "Greek yogurt", "Oats"], ["arati pandu", "kela"])
f("Apple", FR, [52, 0.3, 14, 0.2, 2.4], [(P, 180)], ["Peanut butter"])
f("Mango", FR, [60, 0.8, 15, 0.4, 1.6], [(P, 200), (CUP, 165)], [], ["mamidi pandu", "aam"])
f("Papaya", FR, [43, 0.5, 11, 0.3, 1.7], [(CUP, 145)], [], ["boppayi"])
f("Guava", FR, [68, 2.6, 14, 1, 5.4], [(P, 100)], [], ["jama kaya", "amrood"])
f("Watermelon", FR, [30, 0.6, 7.6, 0.2, 0.4], [(CUP, 150)])
f("Orange", FR, [47, 0.9, 12, 0.1, 2.4], [(P, 130)], [], ["kamala", "santra"])
f("Pomegranate", FR, [83, 1.7, 19, 1.2, 4], [(CUP, 174)], [], ["danimma", "anar"])
f("Grapes", FR, [69, 0.7, 18, 0.2, 0.9], [(CUP, 150)])
f("Pineapple", FR, [50, 0.5, 13, 0.1, 1.4], [(CUP, 165)])
f("Chikoo", FR, [83, 0.4, 20, 1.1, 5.3], [(P, 70)], [], ["sapota"])
f("Custard apple", FR, [94, 2.1, 24, 0.3, 4.4], [(P, 150)], [], ["seethaphal"])
f("Muskmelon", FR, [34, 0.8, 8, 0.2, 0.9], [(CUP, 160)])
f("Pear", FR, [57, 0.4, 15, 0.1, 3.1], [(P, 180)])
f("Kiwi", FR, [61, 1.1, 15, 0.5, 3], [(P, 75)])
f("Strawberries", FR, [32, 0.7, 7.7, 0.3, 2], [(CUP, 150)])
f("Dates", FR, [277, 1.8, 75, 0.2, 6.7], [(P, 8)], [], ["kharjuram", "khajur"])
f("Avocado", FR, [160, 2, 8.5, 14.7, 6.7], [("half", 75), (P, 150)], ["Brown bread"])

NT = "Nuts & seeds"
f("Almonds", NT, [579, 21, 22, 50, 12.5], [(P, 1.2), ("handful", 28)], [], ["badam"])
f("Cashews", NT, [553, 18, 30, 44, 3.3], [(P, 1.5), ("handful", 28)], [], ["kaju", "jeedipappu"])
f("Walnuts", NT, [654, 15, 14, 65, 6.7], [(P, 4), ("handful", 28)], [], ["akhrot"])
f("Peanuts", NT, [585, 24, 21, 50, 8], [("handful", 30), (T, 9)], [], ["palli", "groundnuts", "verusenaga"])
f("Peanut butter", NT, [588, 25, 20, 50, 6], [(T, 16)], ["Brown bread", "Banana", "Apple"])
f("Chia seeds", NT, [486, 17, 42, 31, 34], [(T, 12)])
f("Flax seeds", NT, [534, 18, 29, 42, 27], [(T, 10)], [], ["avise ginjalu", "alsi"])
f("Pumpkin seeds", NT, [559, 30, 11, 49, 6], [(T, 10)])
f("Roasted makhana", NT, [350, 9.7, 77, 0.1, 14], [(CUP, 15)], [], ["fox nuts", "lotus seeds"])
f("Roasted chana", NT, [370, 22, 58, 5, 17], [("handful", 30)], [], ["putnalu", "bhuna chana"])

SN = "Snacks & street food"
f("Samosa", SN, [260, 4, 26, 16, 2.5], [(P, 90)], ["Mint chutney", "Tea with milk & sugar"])
f("Kachori", SN, [410, 8, 40, 24, 4], [(P, 60)], ["Tea with milk & sugar"])
f("Pani puri", SN, [230, 4, 38, 7, 3], [("plate (6)", 150)])
f("Bhel puri", SN, [170, 4.5, 28, 5, 3], [("plate", 150)])
f("Pav bhaji", SN, [180, 4, 24, 7.5, 4], [("plate", 350)], ["Butter"])
f("Vada pav", SN, [250, 6, 35, 9.5, 3], [(P, 140)], ["Mint chutney"])
f("Onion pakoda", SN, [300, 7, 30, 17, 4], [("plate", 100), (P, 20)], ["Tea with milk & sugar"], ["pakodi", "bhajji"])
f("Murukku", SN, [520, 8, 60, 27, 4], [(P, 15)], [], ["chakli", "janthikalu"])
f("Mixture", SN, [530, 12, 45, 34, 6], [("handful", 30)], [], ["namkeen"])
f("Marie biscuits", SN, [440, 7, 77, 11, 2], [(P, 7)], ["Tea with milk & sugar"])
f("Digestive biscuits", SN, [470, 7, 63, 21, 3.5], [(P, 15)], ["Tea with milk & sugar"])
f("Potato chips", SN, [536, 7, 53, 35, 4.4], [("pack", 30)])
f("Popcorn", SN, [387, 13, 78, 4.5, 15], [(CUP, 8)])
f("Maggi noodles", SN, [448, 9.6, 60, 18, 2], [("pack", 70)], [], ["instant noodles"])
f("Veg momos", SN, [170, 5, 28, 4, 2], [(P, 25), ("plate (6)", 150)])
f("Chicken momos", SN, [190, 9, 24, 6, 1], [(P, 28), ("plate (6)", 170)])
f("Spring roll", SN, [250, 5, 30, 12, 2], [(P, 60)])
f("French fries", SN, [312, 3.4, 41, 15, 3.8], [("medium", 110)])
f("Veg sandwich", SN, [220, 6, 30, 8, 3], [(P, 150)])
f("Chicken sandwich", SN, [230, 13, 25, 8, 2], [(P, 170)])
f("Veg burger", SN, [250, 7, 32, 10, 3], [(P, 180)], ["French fries", "Cola"])
f("Pizza", SN, [266, 11, 33, 10, 2.3], [("slice", 107)], ["Cola"])
f("Sweet corn", SN, [96, 3.4, 21, 1.5, 2.4], [(CUP, 150)], [], ["mokka jonna", "bhutta"])
f("Boiled chana chaat", SN, [140, 7, 20, 3.5, 6], [KAT])
f("Sprouts", SN, [30, 3, 6, 0.2, 1.8], [(CUP, 100), KAT], [], ["molakalu", "moong sprouts"])
f("Granola bar", SN, [470, 10, 64, 20, 5], [(P, 25)])

SW = "Sweets"
f("Gulab jamun", SW, [380, 5, 52, 17, 0.5], [(P, 40)])
f("Rasgulla", SW, [186, 4, 40, 1.8, 0], [(P, 50)])
f("Jalebi", SW, [400, 3, 60, 17, 0.5], [(P, 30)])
f("Besan laddu", SW, [480, 9, 55, 25, 3], [(P, 40)])
f("Boondi laddu", SW, [430, 6, 60, 19, 1], [(P, 40)])
f("Kaju katli", SW, [450, 9, 55, 22, 1], [(P, 15)])
f("Mysore pak", SW, [550, 6, 45, 38, 1.5], [(P, 30)])
f("Payasam", SW, [150, 4, 22, 5, 0.3], [KAT], [], ["kheer", "paramannam"])
f("Gajar halwa", SW, [220, 4, 28, 10, 2], [(K, 100)])
f("Pootharekulu", SW, [430, 3, 70, 15, 0.5], [(P, 25)])
f("Ariselu", SW, [400, 4, 70, 12, 1], [(P, 40)])
f("Vanilla ice cream", SW, [207, 3.5, 24, 11, 0.7], [("scoop", 66)])
f("Dark chocolate", SW, [546, 5, 61, 31, 7], [("square", 10)])
f("Milk chocolate", SW, [535, 7.7, 59, 30, 3.4], [("square", 10), ("bar", 40)])
f("Cake", SW, [370, 5, 50, 17, 1], [("slice", 80)])

CH = "Chutneys & sides"
f("Coconut chutney", CH, [210, 3, 9, 18, 5], [(T, 15), ("katori (small)", 50)], [], ["kobbari pachadi"])
f("Peanut chutney", CH, [280, 11, 10, 22, 4], [(T, 15), ("katori (small)", 50)], [], ["palli chutney"])
f("Tomato chutney", CH, [90, 1.5, 9, 5.5, 1.5], [(T, 15), ("katori (small)", 50)], [], ["tomato pachadi"])
f("Ginger chutney", CH, [120, 1.5, 15, 6, 2], [(T, 15)], [], ["allam pachadi"])
f("Mint chutney", CH, [60, 3, 8, 1.5, 3], [(T, 15)], [], ["green chutney", "pudina chutney"])
f("Gunpowder podi", CH, [380, 15, 40, 18, 10], [(T, 10)], ["Ghee"], ["karam podi", "idli podi", "milagai podi"])
f("Mango pickle", CH, [260, 1, 6, 25, 3], [(T, 15)], [], ["avakaya", "aam ka achar"])
f("Gongura pickle", CH, [240, 2, 8, 22, 4], [(T, 15)], [], ["gongura pachadi"])
f("Papad", CH, [370, 26, 60, 3, 10], [("roasted", 12)], [], ["appadam", "papadam"])
f("Fried papad", CH, [460, 22, 48, 20, 8], [(P, 15)], [], ["appadam fried"])
f("Onion salad", CH, [40, 1.1, 9, 0.1, 1.7], [(K, 75)])
f("Jam", CH, [278, 0.4, 69, 0.1, 1], [(T, 20)])
f("Ketchup", CH, [112, 1, 26, 0.1, 0.3], [(T, 17)])

FT = "Ghee, oil & sugar"
f("Ghee", FT, [900, 0, 0, 100, 0], [("tsp", 5), (T, 14)], [], ["neyyi", "desi ghee"])
f("Butter", FT, [717, 0.9, 0.1, 81, 0], [("tsp", 5), (T, 14)])
f("Cooking oil", FT, [884, 0, 0, 100, 0], [("tsp", 5), (T, 14)], [], ["sunflower oil", "groundnut oil"])
f("Coconut oil", FT, [862, 0, 0, 100, 0], [("tsp", 5), (T, 14)])
f("Sugar", FT, [387, 0, 100, 0, 0], [("tsp", 4)], [], ["chakkera", "cheeni"])
f("Jaggery", FT, [383, 0.4, 98, 0.1, 0], [(P, 10)], [], ["bellam", "gud"])
f("Honey", FT, [304, 0.3, 82, 0, 0.2], [("tsp", 7), (T, 21)])

GB = "Global & healthy"
f("Oats", GB, [389, 16.9, 66, 6.9, 10.6], [("cup (dry)", 40), (T, 8)], ["Milk (toned)", "Banana", "Almonds", "Chia seeds"], ["oatmeal", "porridge"])
f("Muesli", GB, [370, 10, 66, 6, 8], [(CUP, 45)], ["Milk (toned)", "Greek yogurt"])
f("Cornflakes", GB, [357, 7.5, 84, 0.4, 3], [(CUP, 30)], ["Milk (toned)", "Banana"])
f("Quinoa", GB, [120, 4.4, 21, 1.9, 2.8], [(CUP, 185)])
f("Tofu", GB, [76, 8, 1.9, 4.8, 0.3], [(G, 100)])
f("Soya chunks", GB, [345, 52, 33, 0.5, 13], [("cup (dry)", 50)], [], ["meal maker", "nutrela"])
f("Hummus", GB, [166, 8, 14, 9.6, 6], [(T, 30)])
f("Pasta (white sauce)", GB, [170, 5, 20, 7.5, 1], [("plate", 250)])
f("Spaghetti (tomato)", GB, [130, 4.5, 22, 2.5, 2], [("plate", 250)])
f("Green salad", GB, [20, 1.2, 3.5, 0.2, 1.8], [BOWL], [], ["salad"])
f("Cucumber", GB, [15, 0.7, 3.6, 0.1, 0.5], [(CUP, 120), (P, 200)], [], ["dosakaya", "kheera"])
f("Carrot", GB, [41, 0.9, 10, 0.2, 2.8], [(P, 60)])
f("Tomato", GB, [18, 0.9, 3.9, 0.2, 1.2], [(P, 100)])
f("Boiled potato", GB, [87, 1.9, 20, 0.1, 1.8], [(P, 150)])
f("Sweet potato", GB, [86, 1.6, 20, 0.1, 3], [(P, 130)], [], ["chilagada dumpa", "shakarkandi"])
f("Broccoli", GB, [34, 2.8, 7, 0.4, 2.6], [(CUP, 90)])

# ---------- icons ----------
ICON_RULES = [
    ("biryani|pulao|fried rice|khichdi|bisi bele", "shallow-pan-of-food"), ("curd rice|lemon rice|pulihora|coconut rice|tomato rice|ghee rice|jeera rice|white rice|brown rice", "cooked-rice"),
    ("ragi mudde", "rice-ball"), ("quinoa", "cooked-rice"),
    ("dosa|pesarattu|uttapam|chilla|appam", "pancakes"), ("idli|idiyappam|puttu", "rice-ball"),
    ("vada|bonda|punugulu|bajji|pakoda|kachori|samosa|spring roll|momos", "dumpling" ),
    ("chapati|phulka|roti|paratha|naan|kulcha|bhatura|thepla|puri|bhature", "flatbread"),
    ("bread|pav|rusk|toast", "bread"), ("sandwich", "sandwich"), ("burger", "hamburger"), ("pizza", "pizza"), ("pasta|spaghetti|maggi|noodle", "spaghetti"),
    ("upma|pongal|poha|kesari|sabudana|semiya|oats|muesli|cornflakes|dhokla|khichdi", "bowl-with-spoon"),
    ("sambar|rasam|dal|pappu|kadhi|rajma|chole|kadala|stew|kurma|salan", "pot-of-food"),
    ("chicken 65|chilli chicken|tandoori|tikka|chicken fry|grilled chicken|keema", "poultry-leg"),
    ("chicken|butter chicken", "curry-rice"), ("mutton", "meat-on-bone"), ("fish", "fish"), ("prawn", "fried-shrimp"),
    ("egg curry", "curry-rice"), ("egg|omelette|bhurji", "cooking"),
    ("paneer|kofta", "cheese-wedge"), ("cheese", "cheese-wedge"),
    ("aloo|potato|dum aloo", "potato"), ("bhindi|beans|cabbage|gobi|dondakaya|sorakaya|mixed veg|avial|saag|palak", "leafy-green"), ("brinjal|vankaya", "pot-of-food"), ("mushroom", "mushroom"),
    ("tea|chai", "teacup-without-handle"), ("coffee|kaapi", "hot-beverage"), ("milk|badam", "glass-of-milk"),
    ("lassi|buttermilk|whey|shake", "cup-with-straw"), ("coconut", "coconut"), ("juice|soda|lime", "tropical-drink"), ("cola", "tumbler-glass"),
    ("curd|yogurt|raita", "bowl-with-spoon"),
    ("banana", "banana"), ("apple|custard apple", "red-apple"), ("mango", "mango"), ("papaya|muskmelon", "melon"), ("guava|pear", "pear"), ("watermelon", "watermelon"), ("orange", "tangerine"),
    ("pomegranate|grapes", "grapes"), ("pineapple", "pineapple"), ("chikoo|dates", "chestnut"), ("kiwi", "kiwi-fruit"), ("strawberr", "strawberry"), ("avocado", "avocado"),
    ("almond|cashew|walnut|peanut|chana|makhana|seeds|mixture|murukku", "peanuts"),
    ("pani puri|bhel|chaat|sprouts", "green-salad"), ("pav bhaji|vada pav", "stuffed-flatbread"), ("chips|fries", "french-fries"),
    ("biscuit|cookie", "cookie"), ("popcorn", "popcorn"), ("corn", "ear-of-corn"), ("granola", "chocolate-bar"),
    ("ice cream", "soft-ice-cream"), ("chocolate", "chocolate-bar"), ("cake", "shortcake"), ("laddu|jamun|rasgulla|jalebi|katli|mysore pak|halwa|pootharekulu|ariselu", "doughnut"), ("payasam|kheer", "bowl-with-spoon"),
    ("chutney|podi|pickle|ketchup|jam", "jar"), ("papad", "flatbread"), ("onion", "onion"),
    ("ghee|butter", "butter"), ("oil", "droplet"), ("sugar", "salt"), ("jaggery", "chestnut"), ("honey", "honey-pot"),
    ("salad", "green-salad"), ("cucumber", "cucumber"), ("carrot", "carrot"), ("tomato", "tomato"), ("sweet potato", "roasted-sweet-potato"), ("broccoli", "broccoli"),
    ("tofu|soya", "beans"), ("hummus", "falafel"),
]
icons = {p.stem for p in pathlib.Path(__file__).resolve().parents[1].joinpath("web/img/3d").glob("*.webp")}
def icon_for(name):
    n = name.lower()
    for pat, ic in ICON_RULES:
        if re.search(pat, n) and ic in icons:
            return ic
    return "fork-and-knife-with-plate"

names = {x["name"] for x in foods}
out = []
for x in foods:
    bad = [p for p in x["pair"] if p not in names]
    assert not bad, (x["name"], bad)
    o = {"id": re.sub(r"[^a-z0-9]+", "-", x["name"].lower()).strip("-"), "name": x["name"], "cat": x["cat"],
         "icon": x["icon"] or icon_for(x["name"]), "per": x["per"], "units": [[u, g] for u, g in x["units"]]}
    if x["pair"]: o["pair"] = [re.sub(r"[^a-z0-9]+", "-", p.lower()).strip("-") for p in x["pair"]]
    if x["alias"]: o["alias"] = x["alias"]
    out.append(o)

cats = list(dict.fromkeys(x["cat"] for x in foods))
js = ("// Generated by tools/build_foods.py. per = per 100 g [kcal, protein, carbs, fat, fibre]; units = [label, grams].\n"
      "// Typical home-style estimates (IFCT 2017 / USDA based).\n"
      f"export const CATEGORIES = {json.dumps(cats)};\n"
      "export const FOODS = [\n" + ",\n".join(json.dumps(o, ensure_ascii=False, separators=(",", ":")) for o in out) + "\n];\n")
pathlib.Path(__file__).resolve().parents[1].joinpath("web/js/foods.js").write_text(js)
print(len(out), "foods,", len(cats), "categories")
from collections import Counter
print(Counter(o["icon"] for o in out).most_common(8))
