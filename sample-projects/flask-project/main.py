from flask import Flask, send_file, render_template_string, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return "Hello This is Flask Project"

@app.route('/html')
def html():
    return render_template('main.html')

@app.route('/image')
def image():
    return send_file("k8s.png", mimetype='image/png')

if __name__ == '__main__':
    app.run(debug=True, port=5000, host="0.0.0.0")
