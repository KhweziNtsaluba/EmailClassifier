import math
from urllib.parse import urlparse, parse_qs

class UrlFeaturizer(object):       

    def setUrl(self, url):
      self.url = url
      self.domain = url.split('//')[-1].split('/')[0]
      self.errCount = 0

    def entropy(self):
        string = self.url.strip()
        prob = [float(string.count(c)) / len(string) for c in dict.fromkeys(list(string))]
        entropy = -sum([(p * math.log(p) / math.log(2.0)) for p in prob])
        return entropy

    def numDigits(self):
        digits = [i for i in self.url if i.isdigit()]
        return len(digits)

    def urlLength(self):
        return len(self.url)

    def numParameters(self):
        try:
          query = urlparse(self.url).query
          if not query:
              return 0
          params = parse_qs(query)
          return len(params)
        except ValueError:
          self.errCount += 1
          return 0


    def numFragments(self):
        fragments = self.url.split('#')
        return len(fragments) - 1

    def numSubDomains(self):
      try:
        hostname = urlparse(self.url).hostname
        if not hostname:
            return 0
        parts = hostname.split('.')
        if len(parts) <= 2:
            return 0
        return len(parts) - 2
      except ValueError:
        self.errCount += 1
        return 0

    def hasHttp(self):
        return 'http:' in self.url

    def hasHttps(self):
        return 'https:' in self.url
    
    def run(self):
        data = {}
        data['entropy'] = self.entropy()
        data['numDigits'] = self.numDigits()
        data['urlLength'] = self.urlLength()
        data['numParams'] = self.numParameters()
        data['hasHttp'] = int(self.hasHttp())
        data['hasHttps'] = int(self.hasHttps())
        data['numFragments'] = self.numFragments()
        data['numSubDomains'] = self.numSubDomains()
        data['num_%20'] = self.url.count("%20")
        data['num_@'] = self.url.count("@")

    
        return data