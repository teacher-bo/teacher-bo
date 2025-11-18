#include <string>
#include <vector>

using namespace std;

vector<string> split_exp(string exp, char sp) {
  vector<string> res;

  int i = 0;
  for (; i < exp.length(); i++) {
    if (exp[i] == sp) {
      break;
    }
  }

  res.push_back(exp.substr(0, i - 1));
  res.push_back(exp.substr(i + 2, exp.length()));

  return res;
}

vector<string> solution(vector<string> expressions) {
  vector<string> answer;
  for (auto ex : expressions) {
    vector<string> parts = split_exp(ex, '=');
    vector<string> left;

    char adder = '+';
    if (parts[0].find('+') != string::npos) {
      left = split_exp(parts[0], '+');
    } else {
      left = split_exp(parts[0], '-');
      adder = '-';
    }

    int first = stoi(left[0]);
    int second = stoi(left[1]);
    int result = stoi(parts[1]);
  }
  return answer;
}