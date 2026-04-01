def calculate_discount(price, discount_percent):
    return price * (discount_percent / 100)

def process_order(items):
    total = 0
    for item in items:
        total += item['price']
    return total
