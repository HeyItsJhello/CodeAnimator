/* File Name: arrayInfo.cpp
*
* This program reads in 40 positive integers and cheks if the values are
* Ascending, Descending, In the same order when read backwards and forwards
*
* Author: Jhelson Gonzales
*/

#include <iostream> 
using namespace std;

int maxIteration;

bool Ascending(int integers[]);
bool Descending(int integers[]);
bool SameOrder(int integers[]);

int main() {
    int integers[40];
    bool special = false;

    cout << "Enter the Values: ";
    for (int i = 0; i < 40; i++) {
        cin >> integers[i];
        maxIteration = i;
        if (integers[i] == -1)
            break;
    }
    if (Descending(integers)) {
        cout << "The integers are in descending order." << endl;
        return 0;
    }
    if (Ascending(integers)) {
        cout << "The integers are in ascending order." << endl;
        return 0;
    }
    if (SameOrder(integers)) {
        cout << "The integers are in the same order when read backward and forwards." << endl;
        return 0;
    }

    cout << "I do not see anything special about these values." << endl;

    return 0;
}

bool Ascending(int integers[]) {
    int current_max = integers[0];

    for (int i = 0; i < maxIteration; i++) {
        if (integers[i] < current_max)
            return false;
        current_max = integers[i];
    }
    return true;
}
bool Descending(int integers[]) {
    int current_min = integers[0];

    for (int i = 0; i < maxIteration; i++) {
        if (integers[i] > current_min)
            return false;
        current_min = integers[i];
    }
    return true;
}

bool SameOrder(int integers[]) {
    for (int i = 0; i < maxIteration; i++) {
        if (integers[i] != integers[maxIteration - (1 + i)])
            return false;
    }
    return true;
}