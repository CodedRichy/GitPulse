def calculate_sum(a, b):
    """Calculate the sum of two numbers with error handling."""
    try:
        if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
            raise TypeError("Both arguments must be numbers")
        return a + b
    except TypeError as e:
        print(f"Error: {e}")
        return None

def main():
    result = calculate_sum(5, 3)
    if result is not None:
        print(f"Result: {result}")
    
    # Test with invalid input
    invalid_result = calculate_sum("hello", 3)
    if invalid_result is None:
        print("Handled invalid input correctly")

if __name__ == "__main__":
    main()
