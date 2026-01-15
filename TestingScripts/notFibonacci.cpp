/* File Name: notFibonacci.cpp
*
* This program reads in two ints a and b, the sequence needs to be the sum of the previous 2 terms
*
* Author: Jhelson Gonzales
*/

#include <iostream>
using namespace std;

int main() {
    int a, b, current = 0;

    cout << "Here is a sequence that is close to Fibonacci. " << endl;
    cout << "Enter a: "; cin >> a;
    cout << "Enter b: "; cin >> b;

    cout << a << ", " << b;

    for (int i = 0; i < 8; i++) {
        current = a + b;
        a = b;
        b = current;
        cout << ", " << current;
    }
    return 0;
}