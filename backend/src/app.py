from flask import Flask 
app = Flask(__name__) 
@app.route("/status")
def status():
    return {"status": "ok","message": "API funcionando"  },200

@app.route("/health")
def health ():
    return{"version": "1.0.0"},200
def main(arg=[]):
    app.run(debug=True)

if __name__ == "__main__":
    main()
